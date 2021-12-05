/**
 * Jest unit test for GET /event/{eventID} method
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

// eslint-disable-next-line node/no-unpublished-import
import * as request from 'supertest';
import TestEnv from '../../TestEnv';

describe('GET /event/{eventID} - Get event detail', () => {
  let testEnv: TestEnv;

  beforeAll(() => {
    jest.setTimeout(120000);
  });

  beforeEach(async () => {
    // Setup test environment
    testEnv = new TestEnv(expect.getState().currentTestName);

    // Start Test Environment
    await testEnv.start();
  });

  afterEach(async () => {
    await testEnv.stop();
  });

  test('Success - All optional field', async () => {
    // Request
    const response = await request(testEnv.expressServer.app).get('/event/3');
    expect(response.status).toBe(200);
    expect(Object.keys(response.body).length).toBe(6);
    expect(response.body.year).toBe(2021);
    expect(response.body.month).toBe(8);
    expect(response.body.date).toBe(26);
    expect(response.body.name).toBe('비대면 정기 모임');
    expect(response.body.detail).toBe('음에서 비대면 정기 모임을 개최합니다.');
    expect(response.body.category).toBe('비대면 모임');
  });

  test('Success - Only detail', async () => {
    // Request
    const response = await request(testEnv.expressServer.app).get('/event/4');
    expect(response.status).toBe(200);
    expect(Object.keys(response.body).length).toBe(5);
    expect(response.body.year).toBe(2021);
    expect(response.body.month).toBe(12);
    expect(response.body.date).toBe(31);
    expect(response.body.name).toBe('연말 결산 모임');
    expect(response.body.detail).toBe(
      '연말을 맞아 BGM 회원끼리 모여 서로의 일년은 어땠는지, 내년 목표는 무엇인지에 관해 이야기해보려 합니다.'
    );
    expect(response.body.category).toBeUndefined();
  });

  test('Success - Only category', async () => {
    // Request
    const response = await request(testEnv.expressServer.app).get('/event/1');
    expect(response.status).toBe(200);
    expect(Object.keys(response.body).length).toBe(5);
    expect(response.body.year).toBe(2021);
    expect(response.body.month).toBe(10);
    expect(response.body.date).toBe(31);
    expect(response.body.name).toBe('할로윈 파티');
    expect(response.body.detail).toBeUndefined();
    expect(response.body.category).toBe('네트워킹');
  });

  test('Success - No optional field', async () => {
    // Request
    const response = await request(testEnv.expressServer.app).get('/event/2');
    expect(response.status).toBe(200);
    expect(Object.keys(response.body).length).toBe(4);
    expect(response.body.year).toBe(2021);
    expect(response.body.month).toBe(8);
    expect(response.body.date).toBe(15);
    expect(response.body.name).toBe('광복절');
    expect(response.body.detail).toBeUndefined();
    expect(response.body.category).toBeUndefined();
  });

  test('Success - Newly added event', async () => {
    // Information that used during the test
    const loginCredentials = {username: 'testuser1', password: 'Password13!'};
    const requiredPayload = {
      year: 2022,
      month: 1,
      date: 1,
      name: '신년 해돋이',
    };

    // Login
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Create new event
    response = await request(testEnv.expressServer.app)
      .post('/event')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({...requiredPayload});
    expect(response.status).toBe(200);

    // Get Event ID for newly registered event
    response = await request(testEnv.expressServer.app).get('/2022-1');
    expect(response.status).toBe(200);
    const eventId = response.body.eventList[0].id;

    // Get the event detail
    // Request
    response = await request(testEnv.expressServer.app).get(
      `/event/${eventId}`
    );
    expect(response.status).toBe(200);
    expect(Object.keys(response.body).length).toBe(4);
    expect(response.body.year).toBe(2022);
    expect(response.body.month).toBe(1);
    expect(response.body.date).toBe(1);
    expect(response.body.name).toBe('신년 해돋이');
    expect(response.body.detail).toBeUndefined();
    expect(response.body.category).toBeUndefined();
  });

  test('Fail - non-numeric id', async () => {
    // Request
    const response = await request(testEnv.expressServer.app).get(
      '/event/newyear'
    );
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');
  });

  test('Fail - Invalid id', async () => {
    // Request
    let response = await request(testEnv.expressServer.app).get('/event/-1');
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');

    // Request
    response = await request(testEnv.expressServer.app).get('/event/0');
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');
  });

  test('Fail - not existing id', async () => {
    // Request
    const response = await request(testEnv.expressServer.app).get('/event/100');
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');
  });
});
