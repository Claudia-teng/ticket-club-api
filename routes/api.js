const express = require('express');
const eventRouter = require('./event.route');
const sessionRouter = require('./session.route');
const areaRouter = require('./area.route');
const seatRouter = require('./seat.route');
const orderRouter = require('./order.route');
const userRouter = require('./user.route');
const api = express.Router();

api.use('/event', eventRouter);
api.use('/session', sessionRouter);
api.use('/area', areaRouter);
api.use('/seat', seatRouter);
api.use('/order', orderRouter);
api.use('/user', userRouter);

module.exports = api;
