const express = require('express');
const areaRouter = require('./area.route');
const seatRouter = require('./seat.route');
const ticketRouter = require('./ticket.route');
const api = express.Router();

api.use('/area', areaRouter);
api.use('/seat', seatRouter);
api.use('/ticket', ticketRouter);

module.exports = api;
