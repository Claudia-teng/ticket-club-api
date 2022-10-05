require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const api = require('./routes/api');

app.use(express.json());
app.use(cors());
app.use('/', api);
app.use(express.static('public'));

app.use(function (req, res) {
  res.status(404).json({
    error: 'Page not found.',
  });
});

app.use(function (err, req, res, next) {
  return res.status(500).json({
    error: 'Internal Server Error.',
  });
});

module.exports = app;
