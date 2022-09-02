require('dotenv').config();
const Redis = require('ioredis');
const redis = new Redis();

redis.on('connect', () => {
  console.log('Redis connected!');
});

redis.on('error', (error) => {
  console.log('Redis connection error:', error);
});

module.exports = redis;
