const { pubClient } = require('../service/cache');
const { getSessionTimeById, checkOnSaleTime } = require('../util/utils');
const { getUserBoughtTicketCount } = require('../models/seat.model');
const ticketLimitPerSession = 4;

async function checkValidation(req, res) {
  const userId = req.user.id;
  const sessionId = req.body.sessionId;
  if (!sessionId) {
    return res.status(400).json({
      error: 'Please provide session ID.',
    });
  }

  let session;
  try {
    session = await getSessionTimeById(sessionId);
  } catch (err) {
    console.log('err');
    return res.status(500).json({
      error: '系統錯誤，請稍後再試。',
    });
  }

  if (!session.length) {
    return res.status(400).json({
      error: '請提供正確的場次資訊',
    });
  }

  if (new Date(session[0].time).getTime() <= new Date().getTime()) {
    return res.status(400).json({
      error: '活動已結束！',
    });
  }

  const passOnSaleTime = await checkOnSaleTime(sessionId);
  if (!passOnSaleTime)
    return res.status(400).json({
      error: '活動尚未開賣！',
    });

  const sessionIndex = await pubClient.lpos(`{${sessionId}}:${sessionId}`, userId);
  const sessionQueueIndex = await pubClient.lpos(`{${sessionId}}:${sessionId}-queue`, userId);
  // console.log('sessionIndex', sessionIndex);
  // console.log('sessionQueueIndex', sessionQueueIndex);
  if (sessionIndex !== null || sessionQueueIndex !== null) {
    return res.status(400).json({
      error: '此帳號已在購票頁面 / 隊伍中！',
    });
  }

  let count = await getUserBoughtTicketCount(req.user.id, sessionId);
  console.log('count', count);

  if (count === ticketLimitPerSession) {
    return res.status(400).json({
      error: `此帳號已購買${ticketLimitPerSession}張，達到單場次上限！`,
    });
  }

  if (count) {
    return res.status(400).json({
      warning: true,
      error: `一個帳號每個場次限購${ticketLimitPerSession}張門票（包含歷史訂單）。此帳號已購買${count}張，確定要用此帳號繼續購買嗎？`,
    });
  }

  return res.status(200).json({
    ok: true,
  });
}

module.exports = {
  checkValidation,
};
