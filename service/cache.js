require('dotenv').config();
const Redis = require('ioredis');
const redis = new Redis({
  port: process.env.REDIS_PORT,
  host: process.env.REDIS_HOST,
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
  tls: {},
});

redis.on('connect', () => {
  console.log('Redis connected!');
});

redis.on('error', (error) => {
  console.log('Redis connection error:', error);
});

module.exports = redis;
