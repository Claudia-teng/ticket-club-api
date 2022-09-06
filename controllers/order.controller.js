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

async function placeOrder(req, res) {
  // todo - validations
  const sessionId = req.body.sessionId;
  const seatIds = req.body.seatIds;

  const connection = await getPoolConnection();
  try {
    await beginTransaction(connection);
    const seats = await getPriceBySeatIds(connection, sessionId, seatIds);
    const total = seats.reduce((acc, curr) => acc.price + curr.price);
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
