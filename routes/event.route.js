const express = require('express');
const eventRouter = express.Router();
const { getAllEvents, getEventDetail } = require('../controllers/event.controller');

eventRouter.get('/', getAllEvents);
eventRouter.get('/:id', getEventDetail);

module.exports = eventRouter;
