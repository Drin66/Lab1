const {DataTypes} = require("sequelize");
const db = require('../config/dbconfig');

const User = db.define('User',{
    id:{
        primaryKey: true,
        autoIncrement: true,
        type: DataTypes.INTEGER
    },
    firstName: DataTypes.STRING,
    lastName: DataTypes.STRING,
    email: DataTypes.STRING,
    password: DataTypes.STRING,
})

module.exports = User



