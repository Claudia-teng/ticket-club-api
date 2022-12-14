const pool = require('../service/db');

async function selectAllEvents(searchText) {
  let sql = 'SELECT id, singer, picture FROM event';
  let values = [];
  if (searchText) {
    sql += ' WHERE title LIKE ?';
    values = [`%${searchText}%`];
  }
  const [rows] = await pool.execute(sql, values);
  return rows;
}

async function getEventById(id) {
  let sql = `
    SELECT e.singer, e.title, e.detail_picture AS detailPicture, e.description, e.video_link, e.on_sale, s.id, s.time, v.city, v.name AS venue
    FROM event e
    JOIN session s ON e.id = s.event_id
    JOIN venue v ON s.venue_id = v.id
    WHERE e.id = ?
    ORDER BY s.time ASC
  `;
  const [rows] = await pool.execute(sql, [id]);
  return rows;
}

module.exports = {
  selectAllEvents,
  getEventById,
};
