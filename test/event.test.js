const request = require('supertest');
const app = require('../app');

describe('Test GET /event/:id', () => {
  test('It should catch missing required event id', async () => {
    const response = await request(app).get('/event/eiofj').expect('Content-Type', /json/).expect(400);

    expect(response.body).toStrictEqual({
      error: 'Please provide a valid event ID.',
    });
  });

  test('It should respond with 200 success', async () => {
    const response = await request(app).get('/event/1').expect('Content-Type', /json/).expect(200);
  });
});
