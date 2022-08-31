const express = require("express");
const areaRouter = express.Router();
const { getAreaBySessionId } = require("../controllers/area.controller");

areaRouter.get("/:id", getAreaBySessionId);

module.exports = areaRouter;
