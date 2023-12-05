import { ApiPromise, Keyring, WsProvider } from "@polkadot/api";
import { waitReady } from "@polkadot/wasm-crypto";
import { config } from "../config";
import db from "../models/db";
import Order, { STATUS, paid } from "../models/order";
import logger from "../tools/logger";

export const keyring = new Keyring({ type: "sr25519" });
export const ss58 = {
  polkadot: 0,
  kusama: 2,
  robonomics: 32
};

async function getApi(endpoint) {
  const provider = new WsProvider(endpoint);
  const api = await ApiPromise.create({ provider });
  return api;
}
async function getBalance(api, address) {
  const balance = await api.query.system.account(address);
  return balance.data.free;
}
export function generateAddress(orderId) {
  return keyring.addFromMnemonic(`${config.crypto.wallet}//${orderId}`).address;
}
export function formateAddress(address, format = ss58.polkadot) {
  return keyring.encodeAddress(address, format);
}
async function checkBalance(api, address, amount) {
  const addressChain = keyring.encodeAddress(address, api?.registry.chainSS58);
  const balance =
    (await getBalance(api, addressChain)).toNumber() /
    10 ** api?.registry.chainDecimals[0];
  if (balance >= Number(amount)) {
    return true;
  }
  return false;
}

export const api = {
  polkadot: null,
  kusama: null
};

export async function start(withApi = false) {
  await waitReady();
  if (withApi) {
    api.polkadot = await getApi(config.crypto.endpoint.polkadot);
    api.kusama = await getApi(config.crypto.endpoint.kusama);
  }
}

function sleep(timeout = 1000) {
  return new Promise((res) => {
    setTimeout(() => {
      res();
    }, timeout);
  });
}

export async function checkOrders() {
  const orders = await Order.findAll({
    where: { status: STATUS.NEW, payment: "crypto" }
  });
  for (const order of orders) {
    try {
      const meta = JSON.parse(order.meta);
      const address = generateAddress(order.id);
      await sleep();
      if (await checkBalance(api.polkadot, address, Number(meta.amountDot))) {
        await order.update({
          meta: JSON.stringify({
            ...meta,
            chain: "polkadot",
            address: formateAddress(address, ss58.polkadot),
            paidtime: Date.now()
          })
        });
        await paid(order.id);
        logger.info(`polkadot ${order.id}`);
        continue;
      }
      await sleep();
      if (await checkBalance(api.kusama, address, Number(meta.amountKsm))) {
        await order.update({
          meta: JSON.stringify({
            ...meta,
            chain: "polkadot",
            address: formateAddress(address, ss58.polkadot),
            paidtime: Date.now()
          })
        });
        await paid(order.id);
        logger.info(`kusama ${order.id}`);
        continue;
      }
    } catch (error) {
      logger.error(`paid ${order.id} ${error.message}`);
    }
  }
}

export async function checkBalancesWallets() {
  const orders = await Order.findAll({
    where: {
      status: { [db.Sequelize.Op.ne]: STATUS.NEW },
      payment: "crypto"
    }
  });
  const balances = {
    polkadot: {},
    kusama: {}
  };
  for (const order of orders) {
    try {
      const meta = JSON.parse(order.meta);
      if (meta && meta.chain) {
        if (meta.chain === "polkadot") {
          const b = (await getBalance(api.polkadot, meta.address)).toNumber();
          if (b > 0) {
            balances.polkadot[meta.address] = { order: order.id, amount: b };
          }
        } else {
          const b = (await getBalance(api.kusama, meta.address)).toNumber();
          if (b > 0) {
            balances.kusama[meta.address] = { order: order.id, amount: b };
          }
        }
      }
    } catch (error) {
      logger.error(`paid ${order.id} ${error.message}`);
    }
    await sleep();
  }
  return balances;
}

async function signAndSend(api, account, tx, options = {}) {
  return new Promise((resolve, reject) => {
    tx.signAndSend(account, options, (result) => {
      if (result.status.isInBlock) {
        result.events.forEach(async (events) => {
          const {
            event: { method, section },
            phase
          } = events;
          if (section === "system" && method === "ExtrinsicFailed") {
            let message = "Error";
            if (result.dispatchError?.isModule) {
              const mod = result.dispatchError.asModule;
              const { docs, name, section } = mod.registry.findMetaError(mod);
              console.log(name, section, docs);
              message = docs.join(", ");
            }
            return reject(new Error(message));
          } else if (section === "system" && method === "ExtrinsicSuccess") {
            const block = await api.rpc.chain.getBlock(
              result.status.asInBlock.toString()
            );
            resolve({
              block: result.status.asInBlock.toString(),
              blockNumber: block.block.header.number.toNumber(),
              txIndex: phase.asApplyExtrinsic.toHuman(),
              tx: tx.hash.toString()
            });
          }
        });
      }
    }).catch(reject);
  });
}

export async function withdraw(balances) {
  for (const address in balances.polkadot) {
    const bob = keyring.addFromMnemonic(
      `${config.crypto.wallet}//${balances.polkadot[address].order}`
    );
    const transfer = api.polkadot.tx.balances.transferAll(
      config.crypto.withdraw.polkadot,
      false
    );
    const res = await signAndSend(api.polkadot, bob, transfer);
    const order = await Order.findOne({
      where: { id: balances.polkadot[address].order }
    });
    await order.update({
      meta: JSON.stringify({
        ...JSON.parse(order.meta),
        withdrawTx: `${res.blockNumber}-${res.txIndex}`
      })
    });
    `Polkadot Transfer sent with hash ${res.blockNumber}-${res.txIndex}`;
  }
  for (const address in balances.kusama) {
    const bob = keyring.addFromMnemonic(
      `${config.crypto.wallet}//${balances.kusama[address].order}`
    );
    const transfer = api.kusama.tx.balances.transferAll(
      config.crypto.withdraw.kusama,
      false
    );
    const res = await signAndSend(api.kusama, bob, transfer);
    const order = await Order.findOne({
      where: { id: balances.kusama[address].order }
    });
    await order.update({
      meta: JSON.stringify({
        ...JSON.parse(order.meta),
        withdrawTx: `${res.blockNumber}-${res.txIndex}`
      })
    });
    console.log(
      `Kusama Transfer sent with hash ${res.blockNumber}-${res.txIndex}`
    );
  }
}
