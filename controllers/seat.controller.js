function getSeatsByAreaId(req, res) {
  return res.status(200).json({
    ok: 'seat',
  });
}

module.exports = {
  getSeatsByAreaId,
};
