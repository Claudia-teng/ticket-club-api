require("dotenv").config();
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USERNAME,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
});

async function insertSeat() {
  let count = 0;
  for (let i = 1; i <= 9; i++) {
    for (let j = 1; j <= 9; j++) {
      for (let k = 1; k <= 9; k++) {
        count++;
        let sql = "INSERT INTO seat (`id`, `area_id`, `column`, `row`) VALUES (?, ?, ?, ?)";
        // console.log("count", "area_id, column, row", [count, i, j, k]);
        await pool.execute(sql, [count, i, j, k]);
      }
    }
  }
  console.log("success");
}

insertSeat();
