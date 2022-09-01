const {
  getSeats,
  getPoolConnection,
  beginTransaction,
  commit,
  rollback,
  findSeatIds,
  getSeatsStatus,
  changeSeatsToLock,
  getSessionInfo,
  getSeatInfo,
} = require('../models/seat.model');
async function getSeatsByAreaId(req, res) {
  // todo - validation

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

async function lockSeats(req, res) {
  // todo - validations

  const sessionId = req.body.sessionId;
  const areaId = req.body.areaId;
  const seats = req.body.tickets;
  // console.log(sessionId, areaId, seats);

  let seatIds = [];
  for (const seat of seats) {
    const seatId = await findSeatIds(seat.row, seat.column, areaId);
    seatIds.push(seatId);
  }

  const connection = await getPoolConnection();
  try {
    await beginTransaction(connection);
    const seatStatus = await getSeatsStatus(sessionId, seatIds);
    // console.log('seatStatus', seatStatus);
    for (let seat of seatStatus) {
      if (seat.status_id !== 1) {
        await rollback(connection);
        return res.status(400).json({
          error: '座位已經被搶走了QQ，請重新選位',
        });
      }
    }
    await changeSeatsToLock(sessionId, seatIds);
    await commit(connection);

    const sessionInfo = await getSessionInfo(sessionId);
    const tickets = [];
    const data = {
      total: 0,
      tickets: tickets,
    };

    for (let status of seatStatus) {
      const seatInfo = await getSeatInfo(status.seat_id);
      tickets.push({
        title: sessionInfo.title,
        time: sessionInfo.time,
        venue: sessionInfo.venue,
        area: seatInfo.area,
        seatId: status.seat_id,
        row: seatInfo.row,
        column: seatInfo.column,
        price: seatInfo.price,
      });
    }
    data.total = tickets.reduce((acc, curr) => acc + curr.price, 0);
    return res.status(200).json(data);
  } catch (err) {
    console.log('err', err);
    await rollback(connection);
    return res.status(200).json({
      error: 'MySQL error',
    });
  } finally {
    connection.release();
  }
}

module.exports = {
  getSeatsByAreaId,
  lockSeats,
};
