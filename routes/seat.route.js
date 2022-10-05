const express = require('express');
const seatRouter = express.Router();
const { isAuth } = require('../util/auth');
const { getSeats, lockSeats } = require('../controllers/seat.controller');

seatRouter.post('/', isAuth, getSeats);
seatRouter.post('/lock', isAuth, lockSeats);

module.exports = seatRouter;
