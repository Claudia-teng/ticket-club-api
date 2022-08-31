const { getAreaIds, getSeatsByAreaIds } = require('../models/area.model');

async function getAreaBySessionId(req, res) {
  // todo - validate session id
  const sessionId = req.params.id;

  let areas = await getAreaIds(sessionId);
  let areaIds = areas.map((area) => area.id).join(', ');
  const seats = await getSeatsByAreaIds(areaIds, sessionId);
  let availableSeats = {};
  seats.forEach((seat) => (availableSeats[seat.area_id] = seat.seats));
  // console.log('availableSeats', availableSeats);
  areas.map((area) => (area.seats = availableSeats[area.id]));
  // console.log('areas', areas);

  let data = {};
  areas.forEach((area) => {
    if (!data[area.price]) {
      data[area.price] = [];
    }
    data[area.price].push({
      id: area.id,
      area: area.name,
      seats: area.seats,
    });
  });

  return res.status(200).json(data);
}

module.exports = {
  getAreaBySessionId,
};
