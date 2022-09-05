const express = require('express');
const eventRouter = require('./event.route');
const areaRouter = require('./area.route');
const seatRouter = require('./seat.route');
const orderRouter = require('./order.route');
const api = express.Router();

api.use('/event', eventRouter);
api.use('/area', areaRouter);
api.use('/seat', seatRouter);
api.use('/order', orderRouter);

module.exports = api;
