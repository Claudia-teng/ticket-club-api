const pool = require('../service/db');
const seatStatusId = require('../configs');

async function getSeatPicture(sessionId) {
  let sql = `SELECT * FROM session WHERE id = ?`;
  const [rows] = await pool.execute(sql, [sessionId]);
  return rows[0].seat_picture;
}

async function getAreaIds(sessionId) {
  let sql = `SELECT a.id, a.name, p.price FROM session s
    JOIN venue v on v.id = s.venue_id 
    JOIN area a on v.id = a.venue_id
    JOIN price p on a.id = p.area_id && p.session_id = s.id
    WHERE s.id = ?`;
  const [rows] = await pool.execute(sql, [sessionId]);
  return rows;
}

async function getSeatsByAreaIds(areaIds, sessionId) {
  let sql = `
    SELECT count(ss.id) AS seats, s.area_id FROM seat_status ss
    JOIN seat s ON ss.seat_id = s.id
    WHERE s.area_id IN (${areaIds}) && ss.session_id = ? && ss.status_id = ?
    GROUP BY s.area_id`;
  const [rows] = await pool.execute(sql, [sessionId, seatStatusId.EMPTY]);
  return rows;
}

module.exports = {
  getSeatPicture,
  getAreaIds,
  getSeatsByAreaIds,
};
