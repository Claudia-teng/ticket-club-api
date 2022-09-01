const express = require('express');
const seatRouter = express.Router();
const { getSeatsByAreaId, lockSeats } = require('../controllers/seat.controller');

seatRouter.post('/', getSeatsByAreaId);
seatRouter.post('/lock', lockSeats);

module.exports = seatRouter;
