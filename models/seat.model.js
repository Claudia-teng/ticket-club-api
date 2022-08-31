const pool = require('../service/db');

async function getSeats(sessionId, areaId) {
  let sql = `SELECT s.column, s.row, ss.status_id FROM seat_status ss
    JOIN seat s ON ss.seat_id = s.id
    WHERE session_id = ? && area_id = ?`;
  const [rows] = await pool.execute(sql, [sessionId, areaId]);
  return rows;
}

module.exports = {
  getSeats,
};
