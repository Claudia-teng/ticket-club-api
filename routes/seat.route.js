const express = require('express');
const seatRouter = express.Router();
const { isAuth } = require('../util/auth');
const { getSeatsByAreaId, lockSeats, selectSeatByPost } = require('../controllers/seat.controller');

seatRouter.post('/', isAuth, getSeatsByAreaId);
seatRouter.post('/select', isAuth, selectSeatByPost);
seatRouter.post('/lock', isAuth, lockSeats);

module.exports = seatRouter;
