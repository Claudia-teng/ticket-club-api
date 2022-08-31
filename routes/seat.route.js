const express = require("express");
const seatRouter = express.Router();
const { getSeatsByAreaId } = require("../controllers/seat.controller");

seatRouter.get("/:id", getSeatsByAreaId);

module.exports = seatRouter;
