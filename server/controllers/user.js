const bcrypt = require("bcrypt");
const User = require("../models/User");

const UserController = {
  async getAllUsers(req, res) {
    try {
      const users = await User.findAll();
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  async createUser(req, res) {
    const { firstName, lastName, email, password } = req.body;
    console.log(firstName)
    try {
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await User.create({
        firstName,
        lastName,
        email,
        password: hashedPassword
      });

      res.json(user);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
};

module.exports = UserController;