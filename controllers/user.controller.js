require('dotenv').config();
const validator = require('validator');
const bcrypt = require('bcrypt');
const pool = require('../service/db');
const { checkUserExistByEmail, insertNewUser, getUserProfile, getOrderDetailByUserId } = require('../models/user.model');
const { generateJwtToken } = require('../util/auth');

async function signup(req, res) {
  let { name, email, password } = req.body;
  if (!name.trim()) {
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
    return res.status(500).json({
      error: '系統錯誤，請稍後再試！',
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
    return res.status(500).json({
      error: '系統錯誤，請稍後再試！',
    });
  }
}

async function getProfile(req, res) {
  try {
    const userId = req.user.id;
    const rows = await getUserProfile(userId);
    const user = rows[0];

    const orders = await getOrderDetailByUserId(userId);
    const orderMap = organizeDetailByOrderId(orders);

    let tickets = Object.values(orderMap);
    tickets = tickets.sort((a, b) => b.orderId - a.orderId);
    const data = {
      name: user.name,
      email: user.email,
      tickets,
    };
    return res.status(200).json(data);
  } catch (err) {
    console.log('err', err);
    return res.status(500).json({
      error: '系統錯誤，請稍後再試！',
    });
  }
}

function organizeDetailByOrderId(orders) {
  const orderMap = {};
  for (const order of orders) {
    if (!orderMap[order.id]) {
      orderMap[order.id] = {
        orderId: order.id,
        session_id: order.session_id,
        title: order.title,
        time: order.time,
        venue: order.venue,
        total: order.price,
        createdAt: order.created_at,
        tickets: [
          {
            area: order.area,
            price: order.price,
            row: order.row,
            column: order.column,
          },
        ],
      };
    } else {
      orderMap[order.id].total += order.price;
      orderMap[order.id].tickets.push({
        area: order.area,
        price: order.price,
        row: order.row,
        column: order.column,
      });
    }
  }
  return orderMap;
}

module.exports = {
  signin,
  signup,
  getProfile,
};
