const express = require('express');
const sessionRouter = express.Router();
const { isAuth } = require('../util/auth');
const { checkAccountDuplicate } = require('../controllers/session.controller');

sessionRouter.post('/validation', isAuth, checkAccountDuplicate);

module.exports = sessionRouter;
