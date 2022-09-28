const { pubClient } = require('../service/cache');
const { validateSessionTime, checkOnSaleTime } = require('../util/utils');

async function checkAccountDuplicate(req, res) {
  const userId = req.user.id;
  const sessionId = req.body.sessionId;
  if (!sessionId) {
    return res.status(400).json({
      error: 'Please provide session ID.',
    });
  }

  let session;
  try {
    session = await validateSessionTime(sessionId);
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
  } else {
    return res.status(200).json({
      ok: true,
    });
  }
}

module.exports = {
  checkAccountDuplicate,
};
