const express = require('express');
const userRouter = express.Router();
const { isAuth } = require('../util/auth');
const { signup, signin, getProfile } = require('../controllers/user.controller');

userRouter.get('/profile', isAuth, getProfile);
userRouter.post('/signup', signup);
userRouter.post('/signin', signin);

module.exports = userRouter;
