require('dotenv').config();
const validator = require('validator');
const bcrypt = require('bcrypt');
const pool = require('../service/db');
const { checkUserExistByEmail, insertNewUser, getUserProfile, getOrderDetailByUserId } = require('../models/user.model');
const { generateJwtToken } = require('../util/auth');

async function signup(req, res) {
  let { name, email, password } = req.body;
  if (!name) {
    return res.status(400).json({
      error: '請輸入使用者名稱',
    });
  }

  if (!validator.isByteLength(name, { max: 30 })) {
    return res.status(400).json({
      error: '使用者名稱過長',
    });
  }

  if (!email) {
    return res.status(400).json({
      error: '請輸入Email',
    });
  }

  if (!validator.isEmail(email)) {
    return res.status(400).json({
      error: 'Email格式錯誤',
    });
  }

  if (!password) {
    return res.status(400).json({
      error: '請輸入密碼',
    });
  }

  if (!validator.isLength(password, { min: 6 })) {
    return res.status(400).json({
      error: '密碼至少6個字符',
    });
  }

  try {
    const rows = await checkUserExistByEmail(email);
    if (rows.length) {
      return res.status(403).json({
        error: '此Email已註冊過',
      });
    }
    password = await bcrypt.hash(password, 10);
    const user = await insertNewUser(name, email, password);
    const token = await generateJwtToken(user.insertId);
    return res.status(200).json({
      data: {
        access_token: token,
        access_expired: process.env.JWT_EXPIRES,
        user: {
          id: user.insertId,
          name,
          email,
        },
      },
    });
  } catch (err) {
    console.log('err', err);
    return res.status(400).json({
      error: '系統錯誤，請稍後再試',
    });
  }
}

async function signin(req, res) {
  let { email, password } = req.body;
  if (!email) {
    return res.status(400).json({
      error: '請輸入Email',
    });
  }

  if (!validator.isEmail(email)) {
    return res.status(400).json({
      error: 'Email格式錯誤',
    });
  }

  if (!password) {
    return res.status(400).json({
      error: '請輸入密碼',
    });
  }

  try {
    let sql = 'SELECT * FROM user WHERE email = ?';
    const [rows] = await pool.execute(sql, [email]);

    if (!rows.length) {
      return res.status(403).json({
        error: '此Email尚未註冊',
      });
    }

    const user = rows[0];
    const auth = await bcrypt.compare(password, user.password);
    if (!auth) {
      return res.status(403).json({
        error: '帳號或密碼錯誤',
      });
    }

    const token = await generateJwtToken(user.id);
    return res.status(200).json({
      data: {
        access_token: token,
        access_expired: process.env.JWT_EXPIRES,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      },
    });
  } catch (err) {
    console.log('err', err);
    return res.status(400).json({
      error: '系統錯誤，請稍後再試',
    });
  }
}

async function getProfile(req, res) {
  try {
    const id = req.user.id;
    const rows = await getUserProfile(id);
    const user = rows[0];
    const details = await getOrderDetailByUserId(id);
    const events = {};
    for (const detail of details) {
      if (!events[detail.session_id]) {
        events[detail.session_id] = {
          session_id: detail.session_id,
          title: detail.title,
          time: detail.time,
          venue: detail.venue,
          total: detail.price,
          createdAt: detail.created_at,
          tickets: [
            {
              area: detail.area,
              price: detail.price,
              row: detail.row,
              column: detail.column,
            },
          ],
        };
      } else {
        events[detail.session_id].total += detail.price;
        events[detail.session_id].tickets.push({
          area: detail.area,
          price: detail.price,
          row: detail.row,
          column: detail.column,
        });
      }
    }
    const data = {
      name: user.name,
      email: user.email,
      tickets: Object.values(events),
    };
    return res.status(200).json(data);
  } catch (err) {
    console.log('err', err);
    return res.status(400).json({
      error: '系統錯誤，請稍後再試',
    });
  }
}

module.exports = {
  signin,
  signup,
  getProfile,
};
