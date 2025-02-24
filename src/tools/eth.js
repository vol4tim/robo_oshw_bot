import { Contract, JsonRpcProvider } from "ethers";
import abi from "../../abi/xrt.json";
import { config } from "../config";

async function getBalanceXRT(provider, address) {
  const contract = new Contract(config.xrt, abi, provider);
  return await contract.balanceOf(address);
}

let api = null;
let provider = null;

export function start() {
  if (!api) {
    provider = new JsonRpcProvider(config.infura);
  }
}

export async function checkBalanceXRT(address) {
  start();
  const balance = Number(await getBalanceXRT(provider, address)) / 10 ** 9;
  if (balance >= 100) {
    return true;
  }
  return false;
}
