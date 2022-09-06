require('dotenv').config();
const validator = require('validator');
const bcrypt = require('bcrypt');
const pool = require('../service/db');
const { generateJwtToken } = require('../util/auth');

async function signup(req, res) {
  let { name, email, password } = req.body;
  if (!name) {
    return res.status(400).json({
      error: 'Name is required.',
    });
  }

  if (!validator.isByteLength(name, { max: 15 })) {
    return res.status(400).json({
      error: 'Please choose a shorter name.',
    });
  }

  if (!email) {
    return res.status(400).json({
      error: 'Email is required.',
    });
  }

  if (!validator.isEmail(email)) {
    return res.status(400).json({
      error: 'Please enter a valid email.',
    });
  }

  if (!password) {
    return res.status(400).json({
      error: 'Password is required.',
    });
  }

  if (!validator.isLength(password, { min: 6 })) {
    return res.status(400).json({
      error: 'Password must be at least 6 characters.',
    });
  }

  try {
    let sql = `SELECT * FROM user WHERE email = ?`;
    const [rows] = await pool.execute(sql, [email]);
    if (rows.length) {
      return res.status(403).json({
        error: 'This email has been signed up before.',
      });
    }
    password = await bcrypt.hash(password, 10);
    sql = `INSERT INTO user (name, email, password) VALUES (?, ?, ?)`;
    const [user] = await pool.execute(sql, [name, email, password]);
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
    console.log(err);
    return res.status(400).json({
      error: 'MySQL error.',
    });
  }
}

async function signin(req, res) {
  let { email, password } = req.body;
  if (!email) {
    return res.status(400).json({
      error: 'Email is required.',
    });
  }

  if (!validator.isEmail(email)) {
    return res.status(400).json({
      error: 'Please enter a valid email.',
    });
  }

  if (!password) {
    return res.status(400).json({
      error: 'Password is required.',
    });
  }

  try {
    let sql = 'SELECT * FROM user WHERE email = ?';
    const [rows] = await pool.execute(sql, [email]);

    if (!rows.length) {
      return res.status(403).json({
        error: 'This email has not been signed up yet.',
      });
    }

    const user = rows[0];
    const auth = await bcrypt.compare(password, user.password);
    if (!auth) {
      return res.status(403).json({
        error: 'Your email or password is incorrect.',
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
    console.log(err);
    return res.status(400).json({
      error: 'MySQL error.',
    });
  }
}

async function getProfile(req, res) {
  try {
    let sql = `SELECT name, email FROM user u WHERE u.id = ?`;
    const [rows] = await pool.execute(sql, [req.user.id]);
    const user = rows[0];
    return res.status(200).json(user);
  } catch (err) {
    console.log(err);
    return res.status(400).json({
      error: 'MySQL error.',
    });
  }
}

module.exports = {
  signin,
  signup,
  getProfile,
};
