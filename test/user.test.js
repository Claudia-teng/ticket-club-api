const request = require('supertest');
const app = require('../app');
const { organizeDetailByOrderId } = require('../controllers/user.controller');

describe('Test POST /signin', () => {
  const completeUserData = {
    email: 'user1@test.com',
    password: 'user111',
  };

  const userDataWithoutEmail = {
    password: 'user111',
  };

  const userDataWithoutPassword = {
    email: 'user1@test.com',
  };

  const userDataWithInvalidEmail = {
    email: 'user1',
    password: 'user111',
  };

  const userDataWithWrongPassword = {
    email: 'user1@test.com',
    password: 'user',
  };

  test('It should catch missing email', async () => {
    const response = await request(app).post('/user/signin').send(userDataWithoutEmail).expect('Content-Type', /json/).expect(400);

    expect(response.body).toStrictEqual({
      error: '請輸入Email',
    });
  });

  test('It should catch missing password', async () => {
    const response = await request(app).post('/user/signin').send(userDataWithoutPassword).expect('Content-Type', /json/).expect(400);

    expect(response.body).toStrictEqual({
      error: '請輸入密碼',
    });
  });

  test('It should catch invalid email', async () => {
    const response = await request(app).post('/user/signin').send(userDataWithInvalidEmail).expect('Content-Type', /json/).expect(400);

    expect(response.body).toStrictEqual({
      error: 'Email格式錯誤',
    });
  });

  test('It should catch wrong email or password', async () => {
    const response = await request(app).post('/user/signin').send(userDataWithWrongPassword).expect('Content-Type', /json/).expect(403);

    expect(response.body).toStrictEqual({
      error: '帳號或密碼錯誤',
    });
  });

  test('It should respond with 200 success', async () => {
    const response = await request(app).post('/user/signin').send(completeUserData).expect('Content-Type', /json/).expect(200);
  });
});

describe('Test organizeDetailByOrderId', () => {
  const orders = [
    {
      id: 102,
      session_id: 2,
      title: 'TWICE - TWICE 4TH WORLD TOUR',
      time: '2023-03-17T03:00:00.000Z',
      venue: 'Zepp New Taipei',
      area: '3樓特一區',
      price: 1000,
      total: 1000,
      row: 1,
      column: 1,
      created_at: '2022-10-05T06:57:34.000Z',
    },
    {
      id: 104,
      session_id: 2,
      title: 'TWICE - TWICE 4TH WORLD TOUR',
      time: '2023-03-17T03:00:00.000Z',
      venue: 'Zepp New Taipei',
      area: '3樓特一區',
      price: 1000,
      total: 2000,
      row: 1,
      column: 3,
      created_at: '2022-10-06T09:02:41.000Z',
    },
    {
      id: 104,
      session_id: 2,
      title: 'TWICE - TWICE 4TH WORLD TOUR',
      time: '2023-03-17T03:00:00.000Z',
      venue: 'Zepp New Taipei',
      area: '3樓特一區',
      price: 1000,
      total: 2000,
      row: 1,
      column: 4,
      created_at: '2022-10-06T09:02:41.000Z',
    },
  ];

  const orderMap = {
    102: {
      orderId: 102,
      session_id: 2,
      title: 'TWICE - TWICE 4TH WORLD TOUR',
      time: '2023-03-17T03:00:00.000Z',
      venue: 'Zepp New Taipei',
      total: 1000,
      createdAt: '2022-10-05T06:57:34.000Z',
      tickets: [
        {
          area: '3樓特一區',
          price: 1000,
          row: 1,
          column: 1,
        },
      ],
    },
    104: {
      orderId: 104,
      session_id: 2,
      title: 'TWICE - TWICE 4TH WORLD TOUR',
      time: '2023-03-17T03:00:00.000Z',
      venue: 'Zepp New Taipei',
      total: 2000,
      createdAt: '2022-10-06T09:02:41.000Z',
      tickets: [
        {
          area: '3樓特一區',
          price: 1000,
          row: 1,
          column: 3,
        },
        {
          area: '3樓特一區',
          price: 1000,
          row: 1,
          column: 4,
        },
      ],
    },
  };

  test('It should be a map with key(orderId):value(orderDetails)', async () => {
    expect(organizeDetailByOrderId(orders)).toEqual(orderMap);
  });
});
