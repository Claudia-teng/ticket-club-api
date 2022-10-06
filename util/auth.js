require('dotenv').config();
const jwt = require('jsonwebtoken');
const pool = require('../service/db');

async function socketIsAuth(token) {
  token = token?.replace('Bearer ', '');
  if (!token || token === 'null') {
    return new Error('請先登入！');
  }

  let user;
  try {
    user = await new Promise((resolve, reject) => {
      jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
        if (err) {
          reject('請重新登入！');
        } else {
          resolve(payload);
        }
      });
    });
  } catch (err) {
    console.log('err', err);
    return new Error('請重新登入！');
  }

  try {
    // console.log('sql', user);
    let sql = `SELECT u.id FROM user u WHERE id = ?`;
    const [rows] = await pool.execute(sql, [user.id]);
    if (!rows.length) return new Error('請重新登入！');
    user = rows[0];
    console.log('pass');
    return user;
  } catch (err) {
    console.log('err', err);
    return new Error('請重新登入！');
  }
}

async function isAuth(req, res, next) {
  let token;
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token || token === 'null') {
    return res.status(401).json({
      error: '請先登入！',
    });
  }

  token = await new Promise((resolve) => {
    jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
      if (err) {
        return res.status(403).json({
          error: '登入錯誤！',
        });
      } else {
        resolve(payload);
      }
    });
  });

  try {
    let sql = `SELECT u.id FROM user u WHERE id = ?`;
    const [rows] = await pool.execute(sql, [token.id]);
    if (!rows.length) {
      return res.status(403).json({
        error: '登入錯誤！',
      });
    }
    req.user = rows[0];
    next();
  } catch (err) {
    console.log('err', err);
    return res.status(400).json({
      error: 'MySQL error.',
    });
  }
}

async function generateJwtToken(userId) {
  const token = await new Promise((resolve, reject) => {
    jwt.sign(
      { id: userId },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES,
      },
      (err, payload) => {
        if (err) {
          reject(null);
        } else {
          resolve(payload);
        }
      }
    );
  });
  return token;
}

module.exports = {
  generateJwtToken,
  socketIsAuth,
  isAuth,
};
