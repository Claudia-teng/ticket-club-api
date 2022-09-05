const { selectAllEvents, getEventById } = require('../models/event.model');

async function getAllEvents(req, res) {
  const searchText = req.query.search;
  try {
    const events = await selectAllEvents(searchText);
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
  const events = await getEventById(eventId);
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
    title: event.title,
    picture: event.picture,
    description: event.description,
    videoLink: event.video_link,
    sessions,
  };
  return res.status(200).json(data);
}

module.exports = {
  getAllEvents,
  getEventDetail,
};
