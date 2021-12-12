/**
 * Jest unit test for DELETE /event/{eventID} method
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

// eslint-disable-next-line node/no-unpublished-import
import * as request from 'supertest';
import * as Cosmos from '@azure/cosmos';
import TestEnv from '../../TestEnv';
import ExpressServer from '../../../src/ExpressServer';

describe('DELETE /event/{eventID} - Delete an existing event', () => {
  let testEnv: TestEnv;

  // DB Container ID
  const EVENT = 'event';

  // Information that used during the test
  const loginCredentials = {id: 'testuser1', password: 'Password13!'};

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

  test('Success - Delete event that I newly registered', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Login
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Register a event
    response = await request(testEnv.expressServer.app)
      .post('/event')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({year: 2022, month: 1, date: 1, name: '신년 해돋이'});
    expect(response.status).toBe(200);

    // Get Event ID for newly registered event
    response = await request(testEnv.expressServer.app).get('/2022-1');
    expect(response.status).toBe(200);
    const eventId = response.body.eventList[0].id;

    // Delete the event
    response = await request(testEnv.expressServer.app)
      .delete(`/event/${eventId}`)
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`]);
    expect(response.status).toBe(200);

    // DB Check
    const queryResult = await testEnv.dbClient
      .container(EVENT)
      .items.query('SELECT * FROM event')
      .fetchAll();
    expect(queryResult.resources.length).toBe(4);
    const checkTarget = queryResult.resources.filter(
      (r: {name: string}) => r.name === '할로윈 파티'
    );
    expect(checkTarget[0].date).toBe(new Date(2021, 9, 31).toISOString());
    expect(checkTarget[0].detail).toBeUndefined();
    expect(checkTarget[0].category).toBe('네트워킹');
    expect(checkTarget[0].editor).toBe('testuser1');
  });

  test('Success - Delete event that I previously registered', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Login
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Get Event ID for newly registered event
    response = await request(testEnv.expressServer.app).get('/2021-10');
    expect(response.status).toBe(200);
    const eventId = response.body.eventList[0].id;

    // Delete the event
    response = await request(testEnv.expressServer.app)
      .delete(`/event/${eventId}`)
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`]);
    expect(response.status).toBe(200);

    // DB Check
    const queryResult = await testEnv.dbClient
      .container(EVENT)
      .items.query('SELECT * FROM event')
      .fetchAll();
    expect(queryResult.resources.length).toBe(3);
    const checkTarget = queryResult.resources.filter(
      (r: {name: string}) => r.name === '광복절'
    );
    expect(checkTarget[0].date).toBe(new Date(2021, 7, 15).toISOString());
    expect(checkTarget[0].detail).toBeUndefined();
    expect(checkTarget[0].category).toBeUndefined();
    expect(checkTarget[0].editor).toBe('testuser2');
  });

  test('Success - Delete event that other person registered', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Login
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Get Event ID for newly registered event
    response = await request(testEnv.expressServer.app).get('/2021-8');
    expect(response.status).toBe(200);
    const eventId = response.body.eventList.filter(
      (e: {name: string}) => e.name === '비대면 정기 모임'
    )[0].id;

    // Delete the event
    response = await request(testEnv.expressServer.app)
      .delete(`/event/${eventId}`)
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`]);
    expect(response.status).toBe(200);

    // DB Check
    const queryResult = await testEnv.dbClient
      .container(EVENT)
      .items.query('SELECT * FROM event')
      .fetchAll();
    expect(queryResult.resources.length).toBe(3);
    const checkTarget = queryResult.resources.filter(
      (r: {name: string}) => r.name === '광복절'
    );
    expect(checkTarget[0].date).toBe(new Date(2021, 7, 15).toISOString());
    expect(checkTarget[0].detail).toBeUndefined();
    expect(checkTarget[0].category).toBeUndefined();
    expect(checkTarget[0].editor).toBe('testuser2');
  });

  test('Success - Delete event with duplicated name', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Login
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Register a event (Duplicated name with 2021-10-31's 할로윈파티)
    response = await request(testEnv.expressServer.app)
      .post('/event')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({year: 2022, month: 10, date: 31, name: '할로윈 파티'});
    expect(response.status).toBe(200);

    // Get Event ID for newly registered event
    response = await request(testEnv.expressServer.app).get('/2022-10');
    expect(response.status).toBe(200);
    const eventId = response.body.eventList[0].id;

    // Delete the event
    response = await request(testEnv.expressServer.app)
      .delete(`/event/${eventId}`)
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`]);
    expect(response.status).toBe(200);

    // DB Check
    const queryResult = await testEnv.dbClient
      .container(EVENT)
      .items.query('SELECT * FROM event')
      .fetchAll();
    expect(queryResult.resources.length).toBe(4);
    const checkTarget = queryResult.resources.filter(
      (r: {name: string}) => r.name === '할로윈 파티'
    );
    expect(checkTarget[0].date).toBe(new Date(2021, 9, 31).toISOString());
    expect(checkTarget[0].detail).toBeUndefined();
    expect(checkTarget[0].category).toBe('네트워킹');
    expect(checkTarget[0].editor).toBe('testuser1');
  });

  test('Fail - Not authorized user', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Delete the event
    const response = await request(testEnv.expressServer.app)
      .delete('/event/3')
      .set('Cookie', ['X-ACCESS-TOKEN=']);
    expect(response.status).toBe(401);
    expect(response.body.error).toBe(
      'Authentication information is missing/invalid'
    );
  });

  test('Fail - Event ID Not Found', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Login
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Delete the event
    response = await request(testEnv.expressServer.app)
      .delete('/event/100')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`]);
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');
  });
});
