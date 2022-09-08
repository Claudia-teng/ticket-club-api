const pool = require('../service/db');

async function getSeats(sessionId, areaId) {
  let sql = `SELECT s.column, s.row, ss.status_id FROM seat_status ss
    JOIN seat s ON ss.seat_id = s.id
    WHERE session_id = ? && area_id = ?`;
  const [rows] = await pool.execute(sql, [sessionId, areaId]);
  return rows;
}

async function getPoolConnection() {
  return pool.getConnection();
}

async function beginTransaction(connection) {
  return connection.beginTransaction();
}

async function commit(connection) {
  return connection.commit();
}

async function rollback(connection) {
  return connection.rollback();
}

async function findSeatIds(row, column, areaId) {
  let sql = 'SELECT id FROM seat WHERE `row` = ? && `column` = ? && `area_id` = ?';
  const [rows] = await pool.execute(sql, [row, column, areaId]);
  return rows[0].id;
}

async function getSeatsStatus(sessionId, seatIds) {
  let placeholder = seatIds.map((id) => (id = '?')).join(', ');
  let sql = `SELECT seat_id, status_id FROM seat_status WHERE session_id = ? AND seat_Id IN (${placeholder}) FOR UPDATE`;
  const [rows] = await pool.execute(sql, [sessionId, ...seatIds]);
  return rows;
}

async function changeSeatsToLock(sessionId, seatIds, userId) {
  let placeholder = seatIds.map((id) => (id = '?')).join(', ');
  let sql = `UPDATE seat_status SET status_id = '2', user_id = ? WHERE session_id = ? AND seat_Id IN (${placeholder})`;
  const [rows] = await pool.execute(sql, [sessionId, userId, ...seatIds]);
  return rows;
}

async function getSessionInfo(sessionId) {
  let sql = `SELECT e.title, s.time, v.name AS venue FROM session s
    JOIN event e ON s.event_id = e.id
    JOIN venue v ON s.venue_id = v.id
    WHERE s.id = ?
  `;
  const [rows] = await pool.execute(sql, [sessionId]);
  return rows[0];
}

async function getSeatInfo(seatId) {
  let sql = `SELECT a.name AS area, s.row, s.column, p.price FROM seat_status ss
    JOIN seat s ON ss.seat_id = s.id
    JOIN area a ON s.area_id = a.id
    JOIN price p ON a.id = p.area_id
    WHERE s.id = ?
  `;
  const [rows] = await pool.execute(sql, [seatId]);
  return rows[0];
}

async function changeSeatsToEmpty(sessionId, seatIds) {
  let placeholder = seatIds.map((id) => (id = '?')).join(', ');
  let sql = `UPDATE seat_status SET status_id = '1' WHERE session_id = ? AND seat_Id IN (${placeholder})`;
  const [rows] = await pool.execute(sql, [sessionId, ...seatIds]);
  return rows;
}

module.exports = {
  getPoolConnection,
  beginTransaction,
  commit,
  rollback,
  findSeatIds,
  getSeatsStatus,
  changeSeatsToLock,
  getSessionInfo,
  getSeatInfo,
  getSeats,
  changeSeatsToEmpty,
};
