const express = require('express');
const router = express.Router();
const UserController = require("../controllers/user");
const bodyParser = require("body-parser");

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

// Define routes
router.get("/all", UserController.getAllUsers);
router.post("/create", UserController.createUser);

module.exports = router;