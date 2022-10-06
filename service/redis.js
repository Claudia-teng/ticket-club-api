require('dotenv').config();
const Redis = require('ioredis');

const {
  REDIS_PORT_1,
  REDIS_HOST_1,
  REDIS_USERNAME_1,
  REDIS_PASSWORD_1,
  REDIS_PORT_2,
  REDIS_HOST_2,
  REDIS_USERNAME_2,
  REDIS_PASSWORD_2,
  REDIS_PORT_3,
  REDIS_HOST_3,
  REDIS_USERNAME_3,
  REDIS_PASSWORD_3,
} = process.env;

const pubClient = new Redis.Cluster([
  {
    port: REDIS_PORT_1,
    host: REDIS_HOST_1,
    username: REDIS_USERNAME_1,
    password: REDIS_PASSWORD_1,
  },
  {
    port: REDIS_PORT_2,
    host: REDIS_HOST_2,
    username: REDIS_USERNAME_2,
    password: REDIS_PASSWORD_2,
  },
  {
    port: REDIS_PORT_3,
    host: REDIS_HOST_3,
    username: REDIS_USERNAME_3,
    password: REDIS_PASSWORD_3,
  },
]);

const subClient = pubClient.duplicate();

pubClient.on('connect', () => {
  console.log('Redis connected!');
});

pubClient.on('error', (error) => {
  console.log('Redis connection error:', error);
});

module.exports = {
  pubClient,
  subClient,
};
