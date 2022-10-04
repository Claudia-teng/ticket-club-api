const pool = require('../service/db');
const { seatStatusId } = require('../configs');
const { getSQLPlaceHolder } = require('../util/utils');

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
  let sql = `SELECT count(*) AS count from seat_status WHERE user_id = ? && session_id = ?`;
  const [rows] = await pool.execute(sql, [userId, sessionId]);
  return rows[0].count;
}

async function getUserBoughtTicketCount(userId, sessionId) {
  let sql = `SELECT count(*) AS count from seat_status WHERE user_id = ? && session_id = ? && status_id = ?`;
  const [rows] = await pool.execute(sql, [userId, sessionId, seatStatusId.SOLD]);
  return rows[0].count;
}

async function getSeatsStatus(sessionId, seatIds) {
  let placeholder = getSQLPlaceHolder(seatIds);
  let sql = `SELECT id, user_id, seat_id, status_id FROM seat_status WHERE session_id = ? AND seat_Id IN (${placeholder}) FOR UPDATE`;
  const [rows] = await pool.execute(sql, [sessionId, ...seatIds]);
  // console.log('rows', rows);
  return rows;
}

async function changeSeatToSelect(userId, sessionId, seatId) {
  // console.log(userId, sessionId, seatId);
  let sql = `UPDATE seat_status SET status_id = ?, user_id = ? WHERE session_id = ? AND seat_Id = ?`;
  const [rows] = await pool.execute(sql, [seatStatusId.OTHER_SELECTED, userId, sessionId, seatId]);
  return rows;
}

async function changeSeatsToLock(sessionId, seatIds, userId) {
  let placeholder = getSQLPlaceHolder(seatIds);
  let sql = `UPDATE seat_status SET status_id = ?, user_id = ? WHERE session_id = ? AND seat_Id IN (${placeholder})`;
  const [rows] = await pool.execute(sql, [seatStatusId.LOCKED, userId, sessionId, ...seatIds]);
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
  let placeholder = getSQLPlaceHolder(seatIds);
  let sql = `SELECT user_id, seat_id, status_id FROM seat_status WHERE session_id = ? AND seat_Id IN (${placeholder})`;
  const [rows] = await pool.execute(sql, [sessionId, ...seatIds]);
  return rows;
}

async function changeSeatsToSelect(sessionId, seatIds) {
  let placeholder = getSQLPlaceHolder(seatIds);
  let sql = `UPDATE seat_status SET status_id = ?, user_id = null WHERE session_id = ? AND seat_Id IN (${placeholder})`;
  const [rows] = await pool.execute(sql, [seatStatusId.OTHER_SELECTED, sessionId, ...seatIds]);
  return rows;
}

async function changeSeatsToEmpty(sessionId, seatIds) {
  let placeholder = getSQLPlaceHolder(seatIds);
  let sql = `UPDATE seat_status SET status_id = ?, user_id = null WHERE session_id = ? AND seat_Id IN (${placeholder})`;
  const [rows] = await pool.execute(sql, [seatStatusId.EMPTY, sessionId, ...seatIds]);
  return rows;
}

async function getSelectedSeats(userId, sessionId) {
  let sql = `SELECT ss.id, s.area_id, s.row, s.column 
    FROM seat_status ss
    JOIN seat s ON ss.seat_id = s.id
    WHERE session_id = ? && user_id = ? && status_id = ?`;
  const [rows] = await pool.execute(sql, [sessionId, userId, seatStatusId.OTHER_SELECTED]);
  return rows;
}

async function getLockedSeats(userId, sessionId) {
  let sql = `SELECT ss.id, s.area_id, s.row, s.column 
    FROM seat_status ss
    JOIN seat s ON ss.seat_id = s.id
    WHERE session_id = ? && user_id = ? && status_id = ?`;
  const [rows] = await pool.execute(sql, [sessionId, userId, seatStatusId.LOCKED]);
  return rows;
}

async function changeSeatsToEmptyByUserId(seatStatusIds) {
  let placeholder = getSQLPlaceHolder(seatStatusIds);
  let sql = `UPDATE seat_status SET status_id = ?, user_id = null WHERE id IN (${placeholder})`;
  await pool.execute(sql, [seatStatusId.EMPTY, ...seatStatusIds]);
}

module.exports = {
  getPoolConnection,
  beginTransaction,
  commit,
  rollback,
  findSeatId,
  getUserTicketCount,
  getUserBoughtTicketCount,
  getSeatsStatus,
  changeSeatsToSelect,
  changeSeatToSelect,
  changeSeatsToLock,
  getSessionInfo,
  getSeatInfo,
  getSeats,
  checkSeatOwner,
  changeSeatsToEmpty,
  getSelectedSeats,
  getLockedSeats,
  changeSeatsToEmptyByUserId,
};
