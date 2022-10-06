require('dotenv').config();
const { getSeatPicture, getAreasBySessionId, getEmptySeatsByArea } = require('../models/area.model');

async function getAreas(req, res) {
  try {
    const sessionId = req.params.id;
    if (!sessionId) {
      return res.status(400).json({
        error: 'Please provide session ID.',
      });
    }

    let areas = await getAreasBySessionId(sessionId);
    if (!areas.length) {
      return res.status(400).json({
        error: 'Please provide valid session ID.',
      });
    }

    areas = await addEmptySeatsInfo(areas, sessionId);
    areas = orderAreasByPrice(areas);

    let seatPicture = await getSeatPicture(sessionId);
    areas.seatPicture = `${process.env.SERVER_IMAGE_PATH}/${seatPicture}`;
    return res.status(200).json(areas);
  } catch (err) {
    console.log('err', err);
    return res.status(500).json({
      error: '系統錯誤，請稍後再試！',
    });
  }
}

async function addEmptySeatsInfo(areas, sessionId) {
  let availableSeats = {};
  const seats = await getEmptySeatsByArea(areas, sessionId);
  seats.forEach((seat) => (availableSeats[seat.area_id] = seat.seats));
  // console.log('availableSeats', availableSeats);
  areas.map((area) => (area.seats = availableSeats[area.id]));
  // console.log('areas', areas);
  return areas;
}

function orderAreasByPrice(areas) {
  let data = {};
  areas.forEach((area) => {
    if (!data[area.price]) {
      data[area.price] = [];
    }
    data[area.price].push({
      id: area.id,
      area: area.name,
      seats: area.seats ? area.seats : 0,
    });
  });
  return data;
}

module.exports = {
  getAreas,
};
