require('dotenv').config();
const mysql = require('mysql2/promise');
const axios = require('axios');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USERNAME,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
});

async function buyTickets() {
  for (let i = 0; i < 1000; i++) {
    const info = {
      sessionId: 1,
      areaId: 1,
      tickets: [
        {
          row: 6,
          column: 1,
          status_id: 1,
        },
        {
          row: 6,
          column: 2,
          status_id: 1,
        },
      ],
    };
    try {
      await axios.post('http://localhost:3000/seat/lock', info);
      console.log('success');
    } catch (err) {
      console.log('err', err.response.data.error);
    }
  }
}

buyTickets();
