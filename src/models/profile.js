import db from "./db";

const Profile = db.sequelize.define("profile", {
  userId: {
    type: db.Sequelize.STRING,
    unique: true
  },
  username: {
    type: db.Sequelize.STRING,
    unique: true
  },
  firstName: {
    type: db.Sequelize.STRING
  },
  lastName: {
    type: db.Sequelize.STRING
  },
  phone: {
    type: db.Sequelize.STRING
  },
  address: {
    type: db.Sequelize.STRING
  }
});

export default Profile;
