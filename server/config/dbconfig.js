const { Sequelize } = require("sequelize");
const db = new Sequelize('Petshop','root','',{
dialect:"mysql",
host:"localhost"
})

db.authenticate()
    .then(() => console.log('Success'))
    .catch(err => console.log(err));

module.exports = db;