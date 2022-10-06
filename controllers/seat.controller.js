const {
  getSeatsByAreaId,
  getSeatId,
  getUserBoughtTicketCount,
  getSeatsStatus,
  getSessionInfo,
  getSeatInfo,
  changeSeatsStatus,
} = require('../models/seat.model');
const { checkSessionExist, checkAreaExist } = require('../util/utils');
const { seatStatusId } = require('../configs');
const ticketLimitPerSession = 4;

async function getSeats(req, res) {
  try {
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
  } catch (err) {
    console.log('err', err);
    return res.status(500).json({
      error: '系統錯誤，請稍後再試！',
    });
  }
}

async function lockSeats(req, res) {
  try {
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
    return res.status(500).json({
      error: '系統錯誤，請稍後再試！',
    });
  }
}

module.exports = {
  getSeats,
  lockSeats,
};
