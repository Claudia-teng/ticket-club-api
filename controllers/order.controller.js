const { changeSeatsToSold } = require('../models/order.model');

async function placeOrder(req, res) {
  // todo - validations

  const sessionId = req.body.sessionId;
  const seatIds = req.body.seatIds;
  try {
    await changeSeatsToSold(sessionId, seatIds);
    return res.status(200).json({
      ok: true,
    });
  } catch (err) {
    console.log('err', err);
    return res.status(400).json({
      error: 'MySQL error.',
    });
  }
}

module.exports = {
  placeOrder,
};
