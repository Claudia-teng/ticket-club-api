const express = require('express');
const seatRouter = express.Router();
const { isAuth } = require('../util/auth');
const { getSeatsByAreaId, lockSeats, refreshToUnlockSeats } = require('../controllers/seat.controller');

seatRouter.post('/', isAuth, getSeatsByAreaId);
seatRouter.post('/lock', isAuth, lockSeats);
seatRouter.post('/unlock', isAuth, refreshToUnlockSeats);

module.exports = seatRouter;
