const express = require('express');
const areaRouter = express.Router();
const { isAuth } = require('../util/auth');
const { getAreaBySessionId } = require('../controllers/area.controller');

areaRouter.get('/:id', isAuth, getAreaBySessionId);

module.exports = areaRouter;
