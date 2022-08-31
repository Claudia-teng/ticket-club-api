const express = require("express");
const areaRouter = require("./area.route");
const seatRouter = require("./seat.route");
const api = express.Router();

api.use("/area", areaRouter);
api.use("/seat", seatRouter);

module.exports = api;
