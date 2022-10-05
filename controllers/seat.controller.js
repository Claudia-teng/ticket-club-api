const {
  getSeatsByAreaId,
  getPoolConnection,
  beginTransaction,
  commit,
  rollback,
  getSeatId,
  getUserTicketCount,
  getUserBoughtTicketCount,
  getSeatsStatus,
  getSessionInfo,
  getSeatInfo,
  checkSeatOwner,
  changeSeatsStatus,
  changeSeatsToEmpty,
  getSelectedSeats,
  getLockedSeats,
  changeSeatsToEmptyByUserId,
} = require('../models/seat.model');
const { checkSessionExist, checkAreaExist } = require('../util/utils');
const { seatStatusId } = require('../configs');
const ticketLimitPerSession = 4;

async function getSeats(req, res) {
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

  const seats = await getSeatsByAreaId(sessionId, areaId);
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
      error: 'You can only buy 4 tickets per session.',
    });
  }

  // console.log(sessionId, areaId, seats);
  let seatIds = [];
  for (const seat of seats) {
    const seatId = await getSeatId(seat.row, seat.column, areaId);
    if (!seatId) {
      return res.status(400).json({
        error: `Can not find row ${seat.row}, column ${seat.column} in area ${areaId}`,
      });
    }
    seatIds.push(seatId);
  }

  let count = await getUserBoughtTicketCount(req.user.id, sessionId);
  console.log('count', count);

  if (count === ticketLimitPerSession) {
    return res.status(400).json({
      error: `此帳號已購買${ticketLimitPerSession}張門票！`,
    });
  }

  if (seatIds.length > 4 - count) {
    return res.status(400).json({
      error: `此帳號只能再購買${4 - count}張門票！`,
    });
  }

  try {
    const seatStatus = await getSeatsStatus(sessionId, seatIds);
    // console.log('seatStatus', seatStatus);
    for (let seat of seatStatus) {
      if (seat.user_id !== req.user.id) {
        return res.status(400).json({
          error: `Seat ID(${seat.seat_id}) is not selected by User ID ${req.user.id}`,
        });
      }
    }

    await changeSeatsStatus(seatStatusId.LOCKED, req.user.id, sessionId, seatIds);

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
    return res.status(200).json({
      error: 'MySQL error',
    });
  }
}

async function selectSeat(data, userId) {
  const sessionId = data.sessionId;
  if (!sessionId) {
    return {
      error: 'Please provide session ID.',
    };
  }

  const sessionExist = await checkSessionExist(sessionId);
  if (!sessionExist) {
    return {
      error: 'Please provide a valid session ID.',
    };
  }

  const areaId = data.areaId;
  if (!areaId) {
    return {
      error: 'Please provide an area ID.',
    };
  }

  const areaExist = await checkAreaExist(areaId);
  if (!areaExist) {
    return {
      error: 'Please provide a valid area ID.',
    };
  }

  // console.log(sessionId, areaId, seats);
  const seatId = await getSeatId(data.row, data.column, areaId);
  if (!seatId) {
    return {
      error: `Can not find row ${data.row}, column ${data.column} in area ${areaId}`,
    };
  }

  let count = await getUserTicketCount(userId, sessionId);
  console.log('count', count);

  if (count === ticketLimitPerSession) {
    return {
      error: `一個帳號每個場次限購${ticketLimitPerSession}張門票（包含歷史訂單）！`,
      rowIndex: data.row - 1,
      columnIndex: data.column - 1,
    };
  }

  const connection = await getPoolConnection();
  try {
    await beginTransaction(connection);
    console.log('seatId', seatId);
    const seatStatus = await getSeatsStatus(sessionId, [seatId]);
    // console.log('seatStatus', seatStatus);
    if (seatStatus[0].status_id !== 1) {
      await rollback(connection);
      return {
        error: '座位已經被搶走了～請重新選位!',
        rowIndex: data.row - 1,
        columnIndex: data.column - 1,
      };
    }

    await changeSeatsStatus(seatStatusId.OTHER_SELECTED, userId, sessionId, [seatId]);
    await commit(connection);
    return {
      ok: true,
    };
  } catch (err) {
    console.log('err', err);
    await rollback(connection);
    return {
      error: '系統錯誤，請稍後再試',
    };
  } finally {
    connection.release();
  }
}

async function unSelectSeat(data, userId) {
  const sessionId = data.sessionId;
  if (!sessionId) {
    return {
      error: 'Please provide session ID.',
    };
  }

  const sessionExist = await checkSessionExist(sessionId);
  if (!sessionExist) {
    return {
      error: 'Please provide a valid session ID.',
    };
  }

  const areaId = data.areaId;
  if (!areaId) {
    return {
      error: 'Please provide an area ID.',
    };
  }

  const areaExist = await checkAreaExist(areaId);
  if (!areaExist) {
    return {
      error: 'Please provide a valid area ID.',
    };
  }

  let seatIds = [];
  for (const seat of data.tickets) {
    const seatId = await getSeatId(seat.row, seat.column, areaId);
    if (!seatId) {
      return {
        error: `Can not find row ${seat.row}, column ${seat.column} in area ${areaId}`,
      };
    }
    seatIds.push(seatId);
  }

  try {
    const seatStatus = await getSeatsStatus(sessionId, seatIds);
    // console.log('seatStatus', seatStatus);
    for (let seat of seatStatus) {
      if (seat.user_id !== userId) {
        return {
          error: `Seat ID(${seat.seat_id}) is not selected by User ID ${userId}`,
        };
      }
    }

    await changeSeatsToEmpty(sessionId, seatIds, userId);
    return {
      ok: true,
    };
  } catch (err) {
    console.log('err', err);
    return {
      error: '系統錯誤，請稍後再試',
    };
  }
}

async function unSelectSeatsByUserId(userId, sessionId) {
  try {
    const selectedSeats = await getSelectedSeats(userId, sessionId);
    console.log('selectedSeats', selectedSeats);
    // no selected seats
    if (!selectedSeats.length) return;
    let seatStatusIds = selectedSeats.map((selectedSeat) => selectedSeat.id);
    await changeSeatsToEmptyByUserId(seatStatusIds);
    const data = selectedSeats.map((selectedSeat) => {
      return {
        row: selectedSeat.row,
        column: selectedSeat.column,
      };
    });
    console.log('data', data);
    return {
      tickets: data,
    };
  } catch (err) {
    console.log('err', err);
    return {
      error: '系統錯誤，請稍後再試！',
    };
  }
}

async function unlockSeats(userId, data) {
  try {
    const seatIds = [];
    if (!data.tickets) {
      return {
        error: 'No tickets received.',
      };
    }

    for (let seat of data.tickets) {
      seatIds.push(seat.seatId);
    }

    if (!data.sessionId) {
      return {
        error: 'Please provide session ID.',
      };
    }

    if (!seatIds.length) {
      return {
        error: 'Please provide at least one seat to unlock.',
      };
    }

    const owners = await checkSeatOwner(data.sessionId, seatIds);
    for (const owner of owners) {
      if (owner.user_id !== userId) {
        return {
          error: `Seat ID(${owner.seat_id}) is not locked by User ID ${userId}`,
        };
      }

      if (owner.status_id !== 2) {
        return {
          error: `Seat ID(${owner.seat_id}) does not have a lock status`,
        };
      }
    }

    await changeSeatsToEmpty(data.sessionId, seatIds);
    return {
      ok: true,
    };
  } catch (err) {
    console.log('err', err);
    return {
      error: 'MySQL error.',
    };
  }
}

async function unlockSeatsByUserId(userId, sessionId) {
  try {
    const lockedSeats = await getLockedSeats(userId, sessionId);
    // console.log('lockedSeats', lockedSeats);
    if (!lockedSeats.length) return;
    let seatStatusIds = lockedSeats.map((lockedSeat) => lockedSeat.id);
    await changeSeatsToEmptyByUserId(seatStatusIds);
    const data = lockedSeats.map((lockedSeat) => {
      return {
        row: lockedSeat.row,
        column: lockedSeat.column,
      };
    });
    // console.log('data', data);
    return {
      tickets: data,
    };
  } catch (err) {
    console.log('err', err);
    return {
      error: '系統錯誤，請稍後再試！',
    };
  }
}

module.exports = {
  getSeats,
  lockSeats,
  unSelectSeat,
  unSelectSeatsByUserId,
  unlockSeats,
  unlockSeatsByUserId,
  selectSeat,
};
