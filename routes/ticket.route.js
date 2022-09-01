const express = require('express');
const ticketRouter = express.Router();
const { lockSeats, placeOrder } = require('../controllers/ticket.controller');

ticketRouter.post('/lock', lockSeats);
ticketRouter.post('/order', placeOrder);

module.exports = ticketRouter;
