const express = require('express');
const orderRouter = express.Router();
const { placeOrder } = require('../controllers/order.controller');

orderRouter.post('/', placeOrder);

module.exports = orderRouter;
