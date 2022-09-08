const pool = require('../service/db');

async function checkSessionExist(sessionId) {
  let sql = 'SELECT * FROM session WHERE id = ?';
  const [rows] = await pool.execute(sql, [sessionId]);
  return rows.length ? true : false;
}

async function checkAreaExist(areaId) {
  let sql = 'SELECT * FROM area WHERE id = ?';
  const [rows] = await pool.execute(sql, [areaId]);
  return rows.length ? true : false;
}

async function checkSeatIdExist(seatId) {
  let sql = 'SELECT user_id from seat_status WHERE seat_id = ?';
  const [rows] = await pool.execute(sql, [seatId]);
  return rows;
}

module.exports = {
  checkSessionExist,
  checkAreaExist,
  checkSeatIdExist,
};
