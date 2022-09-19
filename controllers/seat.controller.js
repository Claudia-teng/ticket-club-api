const {
  getSeats,
  getPoolConnection,
  beginTransaction,
  commit,
  rollback,
  findSeatIds,
  getUserTicketCount,
  getSeatsStatus,
  changeSeatsToLock,
  getSessionInfo,
  getSeatInfo,
  changeSeatsToEmpty,
} = require('../models/seat.model');
const { checkSessionExist, checkAreaExist } = require('../util/utils');

async function getSeatsByAreaId(req, res) {
  const sessionId = req.body.sessionId;
  if (!sessionId) {
    return res.status(400).json({
      error: 'Please provide session ID.',
    });
  }

  const areaId = req.body.areaId;
  if (!areaId) {
    return res.status(400).json({
      error: 'Please provide area ID.',
    });
  }

  const seats = await getSeats(sessionId, areaId);
  if (!seats.length) {
    return res.status(400).json({
      error: `Please provide valid session ID(${sessionId}) & area ID(${areaId}).`,
    });
  }

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
  const sessionId = req.body.sessionId;
  if (!sessionId) {
    return res.status(400).json({
      error: 'Please provide session ID.',
    });
  }

  const sessionExist = await checkSessionExist(sessionId);
  if (!sessionExist) {
    return res.status(400).json({
      error: 'Please provide a valid session ID.',
    });
  }

  const areaId = req.body.areaId;
  if (!areaId) {
    return res.status(400).json({
      error: 'Please provide an area ID.',
    });
  }

  const areaExist = await checkAreaExist(areaId);
  if (!areaExist) {
    return res.status(400).json({
      error: 'Please provide a valid area ID.',
    });
  }

  const seats = req.body.tickets;
  if (seats.length > 4) {
    return res.status(400).json({
      error: 'You can only buy 4 tickets one time.',
    });
  }

  // console.log(sessionId, areaId, seats);
  let seatIds = [];
  for (const seat of seats) {
    const seatId = await findSeatIds(seat.row, seat.column, areaId);
    if (!seatId) {
      return res.status(400).json({
        error: `Can not find row ${seat.row}, column ${seat.column} in area ${areaId}`,
      });
    }
    seatIds.push(seatId);
  }

  let ticketLimitPerSession = 4;
  let count = await getUserTicketCount(req.user.id, sessionId);
  console.log('count', count);

  if (count === ticketLimitPerSession) {
    return res.status(400).json({
      error: `此帳號已購買${ticketLimitPerSession}張門票`,
    });
  }

  if (seatIds.length > 4 - count) {
    return res.status(400).json({
      error: `此帳號只能再購買${4 - count}張`,
    });
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

    await changeSeatsToLock(sessionId, seatIds, req.user.id);
    await commit(connection);

    const sessionInfo = await getSessionInfo(sessionId);
    const tickets = [];
    const data = {
      total: 0,
      sessionId: sessionId,
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

async function unlockSeats(data) {
  try {
    const seatIds = [];
    if (!data.tickets) {
      console.log('No tickets received.');
      return;
    }

    for (let seat of data.tickets) {
      seatIds.push(seat.seatId);
    }

    if (!data.sessionId) {
      console.log('Please provide session ID.');
      return;
    }

    if (!seatIds.length) {
      console.log('Please provide at least one seat to unlock.');
      return;
    }

    await changeSeatsToEmpty(data.sessionId, seatIds);
  } catch (err) {
    console.log('err', err);
  }
}

module.exports = {
  getSeatsByAreaId,
  lockSeats,
  unlockSeats,
};
