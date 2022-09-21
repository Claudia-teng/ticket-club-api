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

async function findSeatId(row, column, areaId) {
  let sql = 'SELECT id FROM seat WHERE `row` = ? && `column` = ? && `area_id` = ?';
  const [rows] = await pool.execute(sql, [row, column, areaId]);
  return rows[0].id;
}

async function getUserTicketCount(userId, sessionId) {
  let sql = 'SELECT count(*) AS count from `order_detail` od JOIN `order` o on o.id = od.order_id WHERE user_id = ? && session_id = ?';
  const [rows] = await pool.execute(sql, [userId, sessionId]);
  return rows[0].count;
}

async function getSeatsStatus(sessionId, seatIds) {
  let placeholder = seatIds.map((id) => (id = '?')).join(', ');
  let sql = `SELECT id, user_id, seat_id, status_id FROM seat_status WHERE session_id = ? AND seat_Id IN (${placeholder}) FOR UPDATE`;
  const [rows] = await pool.execute(sql, [sessionId, ...seatIds]);
  console.log('rows', rows);
  return rows;
}

async function changeSeatToSelect(userId, sessionId, seatId) {
  // console.log(userId, sessionId, seatId);
  let sql = `UPDATE seat_status SET status_id = '5', user_id = ? WHERE session_id = ? AND seat_Id = ?`;
  const [rows] = await pool.execute(sql, [userId, sessionId, seatId]);
  return rows;
}

async function changeSeatsToLock(sessionId, seatIds, userId) {
  // console.log('userId', userId);
  // console.log('sessionId', sessionId);
  let placeholder = seatIds.map((id) => (id = '?')).join(', ');
  let sql = `UPDATE seat_status SET status_id = '2', user_id = ? WHERE session_id = ? AND seat_Id IN (${placeholder})`;
  const [rows] = await pool.execute(sql, [userId, sessionId, ...seatIds]);
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

async function checkSeatOwner(sessionId, seatIds) {
  let placeholder = seatIds.map((id) => (id = '?')).join(', ');
  let sql = `SELECT user_id, seat_id, status_id FROM seat_status WHERE session_id = ? AND seat_Id IN (${placeholder})`;
  const [rows] = await pool.execute(sql, [sessionId, ...seatIds]);
  return rows;
}

async function changeSeatsToSelect(sessionId, seatIds) {
  let placeholder = seatIds.map((id) => (id = '?')).join(', ');
  let sql = `UPDATE seat_status SET status_id = '4', user_id = null WHERE session_id = ? AND seat_Id IN (${placeholder})`;
  const [rows] = await pool.execute(sql, [sessionId, ...seatIds]);
  return rows;
}

async function changeSeatsToEmpty(sessionId, seatIds) {
  let placeholder = seatIds.map((id) => (id = '?')).join(', ');
  let sql = `UPDATE seat_status SET status_id = '1', user_id = null WHERE session_id = ? AND seat_Id IN (${placeholder})`;
  const [rows] = await pool.execute(sql, [sessionId, ...seatIds]);
  return rows;
}

async function getLockedSeats(userId, sessionId) {
  let sql = `SELECT ss.id, s.area_id, s.row, s.column 
    FROM seat_status ss
    JOIN seat s ON ss.seat_id = s.id
    WHERE session_id = ? && user_id = ? && status_id = '2'`;
  const [rows] = await pool.execute(sql, [sessionId, userId]);
  return rows;
}

async function changeSeatsToEmptyByUserId(seatStatusIds) {
  let placeholder = seatStatusIds.map((seatStatus) => (seatStatus = '?')).join(', ');
  let sql = `UPDATE seat_status SET status_id = '1', user_id = null WHERE id IN (${placeholder})`;
  await pool.execute(sql, seatStatusIds);
}

module.exports = {
  getPoolConnection,
  beginTransaction,
  commit,
  rollback,
  findSeatId,
  getUserTicketCount,
  getSeatsStatus,
  changeSeatsToSelect,
  changeSeatToSelect,
  changeSeatsToLock,
  getSessionInfo,
  getSeatInfo,
  getSeats,
  checkSeatOwner,
  changeSeatsToEmpty,
  getLockedSeats,
  changeSeatsToEmptyByUserId,
};
