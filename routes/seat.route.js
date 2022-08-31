const express = require('express');
const seatRouter = express.Router();
const { getSeatsByAreaId } = require('../controllers/seat.controller');

seatRouter.post('/', getSeatsByAreaId);

module.exports = seatRouter;
