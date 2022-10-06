require('dotenv').config();
const axios = require('axios');

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
