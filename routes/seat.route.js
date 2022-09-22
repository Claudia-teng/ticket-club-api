const express = require('express');
const seatRouter = express.Router();
const { isAuth } = require('../util/auth');
const { getSeatsByAreaId, lockSeats } = require('../controllers/seat.controller');

seatRouter.post('/', isAuth, getSeatsByAreaId);
seatRouter.post('/lock', isAuth, lockSeats);

module.exports = seatRouter;
