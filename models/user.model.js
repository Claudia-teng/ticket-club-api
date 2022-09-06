const pool = require('../service/db');

async function checkUserExistByEmail(email) {
  let sql = `SELECT * FROM user WHERE email = ?`;
  const [rows] = await pool.execute(sql, [email]);
  return rows;
}

async function insertNewUser(name, email, password) {
  let sql = `INSERT INTO user (name, email, password) VALUES (?, ?, ?)`;
  const [rows] = await pool.execute(sql, [name, email, password]);
  return [rows];
}

async function getUserProfile(userId) {
  let sql = `SELECT name, email FROM user u WHERE u.id = ?`;
  const [rows] = await pool.execute(sql, [userId]);
  return rows;
}

async function getOrderDetailByUserId(userId) {
  let sql = `SELECT session_id, e.title, s.time, v.name AS venue, a.name, od.price, o.total FROM \`order\` o
    JOIN session s ON o.session_id = s.id
    JOIN event e ON e.id = s.event_id
    JOIN venue v ON s.venue_id = v.id
    JOIN order_detail od ON o.id = od.order_id 
    JOIN area a ON a.id = od.seat_id
    WHERE user_id = ?`;
  const [rows] = await pool.execute(sql, [userId]);
  return rows;
}

module.exports = {
  checkUserExistByEmail,
  insertNewUser,
  getUserProfile,
  getOrderDetailByUserId,
};
