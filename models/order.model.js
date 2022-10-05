const pool = require('../service/db');
const { seatStatusId } = require('../configs');
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

module.exports = {
  getPoolConnection,
  beginTransaction,
  commit,
  rollback,
  changeSeatsToSold,
  getPriceBySeatIds,
  insertOrder,
  insertOrderDetail,
};
