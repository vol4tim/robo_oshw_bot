import db from "./db";
import Profile from "./profile";

const Lucky = db.sequelize.define("lucky", {
  profileId: {
    type: db.Sequelize.INTEGER
  },
  address: {
    type: db.Sequelize.STRING
  },
  signature: {
    type: db.Sequelize.STRING
  }
});

export async function saveLucky(userId, address, signature) {
  const profile = await Profile.findOne({ where: { userId: userId } });
  const lucky = await Lucky.create({
    profileId: profile.id,
    address: address,
    signature: signature
  });
  return lucky.id;
}

export default Lucky;
