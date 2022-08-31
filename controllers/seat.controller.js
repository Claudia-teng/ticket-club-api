const { getSeats } = require('../models/seat.model');

async function getSeatsByAreaId(req, res) {
  const sessionId = req.body.sessionId;
  const areaId = req.body.areaId;
  const seats = await getSeats(sessionId, areaId);

  let map = {};
  seats.forEach((seat) => {
    if (!map[seat.row]) {
      map[seat.row] = [];
    }
    map[seat.row].push(seat);
  });
  const data = Object.values(map);
  return res.status(200).json(data);
}

module.exports = {
  getSeatsByAreaId,
};
