require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USERNAME,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
});

async function insertSeat() {
  let count = 2187;
  for (let i = 1; i <= 729; i++) {
    count++;
    let sql = 'INSERT INTO seat_status (`id`, `session_id`, `seat_id`, `status_id`) VALUES (?, ?, ?, ?)';
    // console.log("[count, 1, i, 1]", [count, 1, i, 1]);
    await pool.execute(sql, [count, 4, i, 1]);
  }
  console.log('success');
}

insertSeat();
