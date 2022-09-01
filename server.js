require('dotenv').config();
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const cors = require('cors');
const api = require('./routes/api');
const PORT = process.env.SERVER_PORT;

app.use(express.json());
app.use(cors());
app.use('/', api);

app.use(function (req, res) {
  res.status(404).json({
    error: 'Page not found.',
  });
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
