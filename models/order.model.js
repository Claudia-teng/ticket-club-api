const pool = require('../service/db');
const seatStatusId = require('../configs');
const { getSQLPlaceHolder } = require('../util/utils');

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
  console.log('order');
  let placeholder = getSQLPlaceHolder(seatIds);
  let sql = `SELECT seat_id, status_id FROM seat_status WHERE session_id = ? AND seat_Id IN (${placeholder}) FOR UPDATE`;
  const [rows] = await pool.execute(sql, [sessionId, ...seatIds]);
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

async function getPriceBySeatIds(connection, sessionId, seatIds) {
  let placeholder = getSQLPlaceHolder(seatIds);
  let sql = `
    SELECT s.id, price FROM price p
    JOIN area a ON p.area_id = a.id
    JOIN seat s ON a.id = s.area_id
    WHERE s.id IN (${placeholder}) && session_id = ?
  `;
  const [rows] = await connection.execute(sql, [...seatIds, sessionId]);
  return rows;
}

async function changeSeatsToSold(connection, sessionId, seatIds) {
  let placeholder = getSQLPlaceHolder(seatIds);
  let sql = `UPDATE seat_status SET status_id = ? WHERE session_id = ? AND seat_Id IN (${placeholder})`;
  const [rows] = await connection.execute(sql, [seatStatusId.SOLD, sessionId, ...seatIds]);
  return rows;
}

async function insertOrder(connection, userId, sessionId, total) {
  let sql = 'INSERT INTO `order` (user_id, session_id, payment_status_id, total) VALUES (?, ?, ?, ?)';
  const [rows] = await connection.execute(sql, [userId, sessionId, 1, total]);
  return rows.insertId;
}

async function insertOrderDetail(connection, orderId, seatId, price) {
  let sql = 'INSERT INTO order_detail (order_id, seat_id, price) VALUES (?, ?, ?)';
  await connection.execute(sql, [orderId, seatId, price]);
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

module.exports = {
  getPoolConnection,
  beginTransaction,
  commit,
  rollback,
  findSeatIds,
  getSeatsStatus,
  changeSeatsToSold,
  getSessionInfo,
  getSeatInfo,
  getPriceBySeatIds,
  insertOrder,
  insertOrderDetail,
};
