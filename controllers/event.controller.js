require('dotenv').config();
const { selectAllEvents, getEventById } = require('../models/event.model');

async function getAllEvents(req, res) {
  const searchText = req.query.search;
  try {
    let events = await selectAllEvents(searchText);
    events.map((event) => (event.picture = `${process.env.SERVER_IMAGE_PATH}/${event.picture}`));
    return res.status(200).json(events);
  } catch (err) {
    console.log('err', err);
    return res.status(400).json({
      error: 'MySQL error.',
    });
  }
}

async function getEventDetail(req, res) {
  const eventId = req.params.id;
  if (!eventId) {
    return res.status(400).json({
      error: 'Please provide an event ID.',
    });
  }

  const events = await getEventById(eventId);
  if (!events.length) {
    return res.status(400).json({
      error: 'Please provide a valid event ID.',
    });
  }

  const event = events[0];
  const sessions = [];
  events.forEach((event) => {
    sessions.push({
      session_id: event.id,
      time: event.time,
      city: event.city,
      venue: event.venue,
    });
  });
  const data = {
    singer: event.singer,
    title: event.title,
    detailPicture: `${process.env.SERVER_IMAGE_PATH}/${event.detailPicture}`,
    description: event.description,
    videoLink: event.video_link,
    onSale: event.on_sale,
    sessions,
  };
  return res.status(200).json(data);
}

module.exports = {
  getAllEvents,
  getEventDetail,
};
