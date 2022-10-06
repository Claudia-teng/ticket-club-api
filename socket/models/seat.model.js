const pool = require('../../service/db');
const { seatStatusId } = require('../../configs');
const { getSQLPlaceHolder } = require('../../util/utils');

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

async function getUserTicketCount(userId, sessionId) {
  let sql = `SELECT count(*) AS count from seat_status WHERE user_id = ? && session_id = ?`;
  const [rows] = await pool.execute(sql, [userId, sessionId]);
  return rows[0].count;
}

async function checkSeatOwner(sessionId, seatIds) {
  let placeholder = getSQLPlaceHolder(seatIds);
  let sql = `SELECT user_id, seat_id, status_id FROM seat_status WHERE session_id = ? AND seat_Id IN (${placeholder})`;
  const [rows] = await pool.execute(sql, [sessionId, ...seatIds]);
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
  getUserTicketCount,
  checkSeatOwner,
  changeSeatsToEmpty,
  getSelectedSeats,
  getLockedSeats,
  changeSeatsToEmptyByUserId,
};
