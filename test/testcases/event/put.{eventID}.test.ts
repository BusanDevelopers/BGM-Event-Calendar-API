/**
 * Jest unit test for PUT /event/{eventID} method
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

// eslint-disable-next-line node/no-unpublished-import
import * as request from 'supertest';
import TestEnv from '../../TestEnv';

describe('PUT /event/{eventID} - Edit an existing event', () => {
  let testEnv: TestEnv;

  // Information that used during the test
  const loginCredentials = {username: 'testuser1', password: 'Password13!'};

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

  test('Success - Edit year', async () => {
    // Login
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Update an event
    response = await request(testEnv.expressServer.app)
      .put('/event/1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({year: 2022});
    expect(response.status).toBe(200);

    // DB Check
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM event WHERE id = 1'
    );
    expect(queryResult.length).toBe(1);
    expect(new Date(queryResult[0].date).toISOString()).toBe(
      new Date(2022, 9, 31).toISOString()
    );
    expect(queryResult[0].name).toBe('할로윈 파티');
    expect(queryResult[0].detail).toBe(null);
    expect(queryResult[0].category).toBe('네트워킹');
    expect(queryResult[0].editor).toBe('testuser1');
  });

  test('Success - Edit month', async () => {
    // Login
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Update an event
    response = await request(testEnv.expressServer.app)
      .put('/event/3')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({month: 10});
    expect(response.status).toBe(200);

    // DB Check
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM event WHERE id = 3'
    );
    expect(queryResult.length).toBe(1);
    expect(new Date(queryResult[0].date).toISOString()).toBe(
      new Date(2021, 9, 26).toISOString()
    );
    expect(queryResult[0].name).toBe('비대면 정기 모임');
    expect(queryResult[0].detail).toBe('음에서 비대면 정기 모임을 개최합니다.');
    expect(queryResult[0].category).toBe('비대면 모임');
    expect(queryResult[0].editor).toBe('testuser1');
  });

  test('Success - Edit date', async () => {
    // Login
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Update an event
    response = await request(testEnv.expressServer.app)
      .put('/event/3')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({date: 11});
    expect(response.status).toBe(200);

    // DB Check
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM event WHERE id = 3'
    );
    expect(queryResult.length).toBe(1);
    expect(new Date(queryResult[0].date).toISOString()).toBe(
      new Date(2021, 7, 11).toISOString()
    );
    expect(queryResult[0].name).toBe('비대면 정기 모임');
    expect(queryResult[0].detail).toBe('음에서 비대면 정기 모임을 개최합니다.');
    expect(queryResult[0].category).toBe('비대면 모임');
    expect(queryResult[0].editor).toBe('testuser1');
  });

  test('Success - Edit name', async () => {
    // Login
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Update an event
    response = await request(testEnv.expressServer.app)
      .put('/event/2')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({name: '공휴일: 광복절'});
    expect(response.status).toBe(200);

    // DB Check
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM event WHERE id = 2'
    );
    expect(queryResult.length).toBe(1);
    expect(new Date(queryResult[0].date).toISOString()).toBe(
      new Date(2021, 7, 15).toISOString()
    );
    expect(queryResult[0].name).toBe('공휴일: 광복절');
    expect(queryResult[0].detail).toBe(null);
    expect(queryResult[0].category).toBe(null);
    expect(queryResult[0].editor).toBe('testuser1');
  });

  test('Success - Edit detail', async () => {
    // Login
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Update an event
    response = await request(testEnv.expressServer.app)
      .put('/event/2')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({detail: '태극기를 계양합시다.'});
    expect(response.status).toBe(200);

    // DB Check
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM event WHERE id = 2'
    );
    expect(queryResult.length).toBe(1);
    expect(new Date(queryResult[0].date).toISOString()).toBe(
      new Date(2021, 7, 15).toISOString()
    );
    expect(queryResult[0].name).toBe('광복절');
    expect(queryResult[0].detail).toBe('태극기를 계양합시다.');
    expect(queryResult[0].category).toBe(null);
    expect(queryResult[0].editor).toBe('testuser1');
  });

  test('Success - Edit category', async () => {
    // Login
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Update an event
    response = await request(testEnv.expressServer.app)
      .put('/event/2')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({category: '공휴일'});
    expect(response.status).toBe(200);

    // DB Check
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM event WHERE id = 2'
    );
    expect(queryResult.length).toBe(1);
    expect(new Date(queryResult[0].date).toISOString()).toBe(
      new Date(2021, 7, 15).toISOString()
    );
    expect(queryResult[0].name).toBe('광복절');
    expect(queryResult[0].detail).toBe(null);
    expect(queryResult[0].category).toBe('공휴일');
    expect(queryResult[0].editor).toBe('testuser1');
  });

  test('Success - Edit numerous properties', async () => {
    // Login
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Update an event - date and name
    response = await request(testEnv.expressServer.app)
      .put('/event/1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({month: 11, date: 1, name: '늦은 할로윈 파티'});
    expect(response.status).toBe(200);
    // DB Check
    let queryResult = await testEnv.dbClient.query(
      'SELECT * FROM event WHERE id = 1'
    );
    expect(queryResult.length).toBe(1);
    expect(new Date(queryResult[0].date).toISOString()).toBe(
      new Date(2021, 10, 1).toISOString()
    );
    expect(queryResult[0].name).toBe('늦은 할로윈 파티');
    expect(queryResult[0].detail).toBe(null);
    expect(queryResult[0].category).toBe('네트워킹');
    expect(queryResult[0].editor).toBe('testuser1');

    // date and detail
    response = await request(testEnv.expressServer.app)
      .put('/event/1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({month: 11, date: 2, detail: '할로윈 주말에 진행하는 파티'});
    expect(response.status).toBe(200);
    // DB Check
    queryResult = await testEnv.dbClient.query(
      'SELECT * FROM event WHERE id = 1'
    );
    expect(queryResult.length).toBe(1);
    expect(new Date(queryResult[0].date).toISOString()).toBe(
      new Date(2021, 10, 2).toISOString()
    );
    expect(queryResult[0].name).toBe('늦은 할로윈 파티');
    expect(queryResult[0].detail).toBe('할로윈 주말에 진행하는 파티');
    expect(queryResult[0].category).toBe('네트워킹');
    expect(queryResult[0].editor).toBe('testuser1');

    // detail and category
    response = await request(testEnv.expressServer.app)
      .put('/event/2')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({detail: '태극기를 계양합시다', category: '공휴일'});
    expect(response.status).toBe(200);
    // DB Check
    queryResult = await testEnv.dbClient.query(
      'SELECT * FROM event WHERE id = 2'
    );
    expect(queryResult.length).toBe(1);
    expect(new Date(queryResult[0].date).toISOString()).toBe(
      new Date(2021, 7, 15).toISOString()
    );
    expect(queryResult[0].name).toBe('광복절');
    expect(queryResult[0].detail).toBe('태극기를 계양합시다');
    expect(queryResult[0].category).toBe('공휴일');
    expect(queryResult[0].editor).toBe('testuser1');

    // everything
    response = await request(testEnv.expressServer.app)
      .put('/event/3')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({
        month: 10,
        date: 11,
        name: '제 1회 비대면 모임',
        detail: '음 링크 추후 공지',
        category: '음 모일',
      });
    expect(response.status).toBe(200);
    // DB Check
    queryResult = await testEnv.dbClient.query(
      'SELECT * FROM event WHERE id = 3'
    );
    expect(queryResult.length).toBe(1);
    expect(new Date(queryResult[0].date).toISOString()).toBe(
      new Date(2021, 9, 11).toISOString()
    );
    expect(queryResult[0].name).toBe('제 1회 비대면 모임');
    expect(queryResult[0].detail).toBe('음 링크 추후 공지');
    expect(queryResult[0].category).toBe('음 모일');
    expect(queryResult[0].editor).toBe('testuser1');

    // Leap Year
    response = await request(testEnv.expressServer.app)
      .put('/event/3')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({
        year: 2024,
        month: 2,
        date: 29,
        name: '제 1회 비대면 모임',
        detail: '음 링크 추후 공지',
        category: '음 모일',
      });
    expect(response.status).toBe(200);
    // DB Check
    queryResult = await testEnv.dbClient.query(
      'SELECT * FROM event WHERE id = 3'
    );
    expect(queryResult.length).toBe(1);
    expect(new Date(queryResult[0].date).toISOString()).toBe(
      new Date(2024, 1, 29).toISOString()
    );
    expect(queryResult[0].name).toBe('제 1회 비대면 모임');
    expect(queryResult[0].detail).toBe('음 링크 추후 공지');
    expect(queryResult[0].category).toBe('음 모일');
    expect(queryResult[0].editor).toBe('testuser1');
  });

  test('Fail - Invalid year range', async () => {
    // Login
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Request
    response = await request(testEnv.expressServer.app)
      .put('/event/3')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({
        year: 2020,
        month: 10,
        date: 11,
        name: '제 1회 비대면 모임',
        detail: '음 링크 추후 공지',
        category: '음 모일',
      });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    // DB Check
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM event WHERE id = 3'
    );
    expect(queryResult.length).toBe(1);
    expect(new Date(queryResult[0].date).toISOString()).toBe(
      new Date(2021, 7, 26).toISOString()
    );
    expect(queryResult[0].name).toBe('비대면 정기 모임');
    expect(queryResult[0].detail).toBe('음에서 비대면 정기 모임을 개최합니다.');
    expect(queryResult[0].category).toBe('비대면 모임');
    expect(queryResult[0].editor).toBe('testuser2');
  });

  test('Fail - Additional field', async () => {
    // Login
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Request
    response = await request(testEnv.expressServer.app)
      .put('/event/3')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({
        month: 10,
        date: 11,
        name: '제 1회 비대면 모임',
        detail: '음 링크 추후 공지',
        category: '음 모일',
        contact: 'bgmadmin@gmail.com',
      });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    // DB Check
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM event WHERE id = 3'
    );
    expect(queryResult.length).toBe(1);
    expect(new Date(queryResult[0].date).toISOString()).toBe(
      new Date(2021, 7, 26).toISOString()
    );
    expect(queryResult[0].name).toBe('비대면 정기 모임');
    expect(queryResult[0].detail).toBe('음에서 비대면 정기 모임을 개최합니다.');
    expect(queryResult[0].category).toBe('비대면 모임');
    expect(queryResult[0].editor).toBe('testuser2');
  });

  test('Fail - Unauthorized', async () => {
    // Login
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);

    // Request
    response = await request(testEnv.expressServer.app)
      .put('/event/3')
      .set('Cookie', ['X-ACCESS-TOKEN='])
      .send({month: 10, date: 11});
    expect(response.status).toBe(401);
    expect(response.body.error).toBe(
      'Authentication information is missing/invalid'
    );

    // DB Check
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM event WHERE id = 3'
    );
    expect(queryResult.length).toBe(1);
    expect(new Date(queryResult[0].date).toISOString()).toBe(
      new Date(2021, 7, 26).toISOString()
    );
    expect(queryResult[0].name).toBe('비대면 정기 모임');
    expect(queryResult[0].detail).toBe('음에서 비대면 정기 모임을 개최합니다.');
    expect(queryResult[0].category).toBe('비대면 모임');
    expect(queryResult[0].editor).toBe('testuser2');
  });

  test('Fail - Invalid date', async () => {
    // Login
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Request
    response = await request(testEnv.expressServer.app)
      .put('/event/1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({month: 9});
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');
    // DB Check
    let queryResult = await testEnv.dbClient.query(
      'SELECT * FROM event WHERE id = 1'
    );
    expect(queryResult.length).toBe(1);
    expect(new Date(queryResult[0].date).toISOString()).toBe(
      new Date(2021, 9, 31).toISOString()
    );
    expect(queryResult[0].name).toBe('할로윈 파티');
    expect(queryResult[0].detail).toBe(null);
    expect(queryResult[0].category).toBe('네트워킹');
    expect(queryResult[0].editor).toBe('testuser1');

    // Request - Leap Year
    response = await request(testEnv.expressServer.app)
      .put('/event/3')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({year: 2021, month: 2, date: 29});
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');
    // DB Check
    queryResult = await testEnv.dbClient.query(
      'SELECT * FROM event WHERE id = 3'
    );
    expect(queryResult.length).toBe(1);
    expect(new Date(queryResult[0].date).toISOString()).toBe(
      new Date(2021, 7, 26).toISOString()
    );
    expect(queryResult[0].name).toBe('비대면 정기 모임');
    expect(queryResult[0].detail).toBe('음에서 비대면 정기 모임을 개최합니다.');
    expect(queryResult[0].category).toBe('비대면 모임');
    expect(queryResult[0].editor).toBe('testuser2');
  });

  test('Fail - Invalid ID (non-numeric / < 1)', async () => {
    // Login
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Update an event
    response = await request(testEnv.expressServer.app)
      .put('/event/halloween-party')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({name: '늦은 할로윈 파티', year: 2022, month: 11, date: 1});
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');

    // Update an event
    response = await request(testEnv.expressServer.app)
      .put('/event/0')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({name: '늦은 할로윈 파티', year: 2022, month: 11, date: 1});
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');

    // Update an event
    response = await request(testEnv.expressServer.app)
      .put('/event/-1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({name: '늦은 할로윈 파티', year: 2022, month: 11, date: 1});
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');
  });

  test('Fail - Event ID Not found', async () => {
    // Login
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Update an event
    response = await request(testEnv.expressServer.app)
      .put('/event/100')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({name: '늦은 할로윈 파티', year: 2022, month: 11, date: 1});
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');
  });
});
