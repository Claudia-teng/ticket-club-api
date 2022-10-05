const express = require('express');
const sessionRouter = express.Router();
const { isAuth } = require('../util/auth');
const { checkValidation } = require('../controllers/session.controller');

sessionRouter.post('/validation', isAuth, checkValidation);

module.exports = sessionRouter;
