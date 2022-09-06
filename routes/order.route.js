const express = require('express');
const orderRouter = express.Router();
const { isAuth } = require('../util/auth');
const { placeOrder } = require('../controllers/order.controller');

orderRouter.post('/', isAuth, placeOrder);

module.exports = orderRouter;
