const pool = require('../service/db');

function getSQLPlaceHolder(items) {
  return items.map(() => '?').join(', ');
}

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

async function checkSeatIdExist(seatId, sessionId) {
  let sql = 'SELECT user_id from seat_status WHERE seat_id = ? AND session_id = ?';
  const [rows] = await pool.execute(sql, [seatId, sessionId]);
  return rows;
}

async function getSessionTimeById(sessionId) {
  let sql = 'SELECT time FROM session WHERE id = ?';
  const [rows] = await pool.execute(sql, [sessionId]);
  return rows;
}

async function checkOnSaleTime(sessionId) {
  let sql = `SELECT on_sale FROM event e
    JOIN session s ON s.event_id = e.id
    WHERE s.id = ?`;
  const [rows] = await pool.execute(sql, [sessionId]);
  return new Date(rows[0].on_sale).getTime() <= new Date().getTime();
}

module.exports = {
  getSQLPlaceHolder,
  checkAreaExist,
  checkSessionExist,
  getSessionTimeById,
  checkSeatIdExist,
  checkOnSaleTime,
};
