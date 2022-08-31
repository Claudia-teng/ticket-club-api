require("dotenv").config();
const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const api = require("./routes/api");
const PORT = process.env.SERVER_PORT;

app.use(express.json());

app.use("/", api);

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
