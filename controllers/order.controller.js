const {
  getPoolConnection,
  commit,
  rollback,
  beginTransaction,
  changeSeatsToSold,
  getPriceBySeatIds,
  insertOrder,
  insertOrderDetail,
} = require('../models/order.model');

const { checkSessionExist, checkSeatIdExist } = require('../util/utils');

async function placeOrder(req, res) {
  const sessionId = req.body.sessionId;
  if (!sessionId) {
    return res.status(400).json({
      error: 'Please provide session ID.',
    });
  }

  const sessionExists = await checkSessionExist(sessionId);
  if (!sessionExists) {
    return res.status(400).json({
      error: 'Please provide valid session ID.',
    });
  }

  const seatIds = req.body.seatIds;
  if (seatIds.length > 4) {
    return res.status(400).json({
      error: 'You can only buy 4 tickets one time.',
    });
  }

  for (let seatId of seatIds) {
    const seats = await checkSeatIdExist(seatId);
    if (!seats.length) {
      return res.status(400).json({
        error: `Seat ID(${seatId}) is not existed.`,
      });
    }

    if (seats[0].user_id !== req.user.id) {
      return res.status(400).json({
        error: `${seatId} is not locked by user ID(${req.user.id}).`,
      });
    }
  }

  const connection = await getPoolConnection();
  try {
    await beginTransaction(connection);
    const seats = await getPriceBySeatIds(connection, sessionId, seatIds);
    if (seats.length !== seatIds.length) {
      await rollback(connection);
      return res.status(400).json({
        error: `Can not find corresponding seat IDs(${seatIds}) by session ID(${sessionId}).`,
      });
    }
    const total = seats.reduce((acc, curr) => acc + curr.price, 0);
    const orderId = await insertOrder(connection, req.user.id, sessionId, total);
    for (let seat of seats) {
      await insertOrderDetail(connection, orderId, seat.id, seat.price);
    }
    await changeSeatsToSold(connection, sessionId, seatIds);
    await commit(connection);
    return res.status(200).json({
      ok: true,
    });
  } catch (err) {
    console.log('err', err);
    await rollback(connection);
    return res.status(400).json({
      error: 'MySQL error.',
    });
  }
}

module.exports = {
  placeOrder,
};
