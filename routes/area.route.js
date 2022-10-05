const express = require('express');
const areaRouter = express.Router();
const { isAuth } = require('../util/auth');
const { getAreas } = require('../controllers/area.controller');

areaRouter.get('/:id', isAuth, getAreas);

module.exports = areaRouter;
