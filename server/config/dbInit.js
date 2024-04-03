const User = require('../models/User');

const initDatabase = () => {
    User.sync({ alter: true });
}

module.exports = initDatabase;