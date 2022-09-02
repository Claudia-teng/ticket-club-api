const express = require('express');
const seatRouter = express.Router();
const { getSeatsByAreaId, lockSeats, unlockSeats } = require('../controllers/seat.controller');

seatRouter.post('/', getSeatsByAreaId);
seatRouter.post('/lock', lockSeats);
seatRouter.post('/unlock', unlockSeats);

module.exports = seatRouter;
