const express = require("express")
// const initDatabase = require("./config/dbInit");
const app = express()
const cors = require("cors")
var bodyParser = require("body-parser");
const userRoute = require("./routes/user")

app.use(bodyParser.json({ extended: true }));
app.use(cors());

//routes
app.use("/user", userRoute)

app.listen(8000, ()=>
{
    console.log("Server running...")
})

//Uncomment for syncing db after running app
// initDatabase();