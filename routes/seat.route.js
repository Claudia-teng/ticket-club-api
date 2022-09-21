const express = require('express');
const seatRouter = express.Router();
const { isAuth } = require('../util/auth');
const { getSeatsByAreaId, lockSeats, selectSeat, unSelectSeat } = require('../controllers/seat.controller');

seatRouter.post('/', isAuth, getSeatsByAreaId);
seatRouter.post('/lock', isAuth, lockSeats);
seatRouter.post('/select', isAuth, selectSeat);
seatRouter.post('/unselect', isAuth, unSelectSeat);

module.exports = seatRouter;
