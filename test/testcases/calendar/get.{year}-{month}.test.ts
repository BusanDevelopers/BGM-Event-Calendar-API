/**
 * Jest unit test for GET /{year}-{month} method
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

// eslint-disable-next-line node/no-unpublished-import
import * as request from 'supertest';
import * as Cosmos from '@azure/cosmos';
import TestEnv from '../../TestEnv';
import ExpressServer from '../../../src/ExpressServer';

describe('GET /{year}-{month}', () => {
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

  test('Success - No Event', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Request
    const response = await request(testEnv.expressServer.app).get('/2022-01');
    expect(response.status).toBe(200);
    expect(response.body.numEvent).toBe(0);
    expect(Object.keys(response.body).length).toBe(1);
  });

  test('Success - Multiple Event (with/without category)', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Request
    const response = await request(testEnv.expressServer.app).get('/2021-08');
    expect(response.status).toBe(200);
    expect(response.body.numEvent).toBe(2);
    const {eventList} = response.body;
    eventList.forEach((e: {name: string; date: number; category: string}) => {
      if (e.name === '광복절') {
        expect(e.date).toBe(15);
        expect(e.category).toBeUndefined();
        expect(Object.keys(e).length).toBe(3);
      } else {
        expect(e.date).toBe(26);
        expect(e.category).toBe('비대면 모임');
        expect(Object.keys(e).length).toBe(4);
      }
    });
    expect(Object.keys(response.body).length).toBe(2);
  });

  test('Success - One Event (without category)', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Request
    const response = await request(testEnv.expressServer.app).get('/2021-12');
    expect(response.status).toBe(200);
    expect(response.body.numEvent).toBe(1);
    expect(response.body.eventList[0].name).toBe('연말 결산 모임');
    expect(response.body.eventList[0].date).toBe(31);
    expect(Object.keys(response.body.eventList[0]).length).toBe(3);
    expect(Object.keys(response.body).length).toBe(2);
  });

  test('Success - One Event (with category)', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Request
    const response = await request(testEnv.expressServer.app).get('/2021-10');
    expect(response.status).toBe(200);
    expect(response.body.numEvent).toBe(1);
    expect(response.body.eventList[0].name).toBe('할로윈 파티');
    expect(response.body.eventList[0].date).toBe(31);
    expect(response.body.eventList[0].category).toBe('네트워킹');
    expect(Object.keys(response.body.eventList[0]).length).toBe(4);
    expect(Object.keys(response.body).length).toBe(2);
  });

  test('Success - Newly Added Event', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Information that used during the test
    const loginCredentials = {
      id: 'testuser1',
      password: 'Password13!',
    };
    const requiredPayload = {
      year: 2022,
      month: 1,
      date: 1,
      name: '신년 해돋이',
    };

    // Admin Login
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Add new event
    response = await request(testEnv.expressServer.app)
      .post('/event')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({
        ...requiredPayload,
        detail: '신년 맞이 일출을 광안리에서 봅니다.',
        category: '네트워킹',
      });
    expect(response.status).toBe(200);

    // Get Event
    response = await request(testEnv.expressServer.app).get('/2022-01');
    expect(response.status).toBe(200);
    expect(response.body.numEvent).toBe(1);
    expect(response.body.eventList[0].name).toBe('신년 해돋이');
    expect(response.body.eventList[0].date).toBe(1);
    expect(response.body.eventList[0].category).toBe('네트워킹');
    expect(Object.keys(response.body.eventList[0]).length).toBe(4);
    expect(Object.keys(response.body).length).toBe(2);
  });

  test('Fail - Non number params', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Non-Number Month
    let response = await request(testEnv.expressServer.app).get('/2022-jan');
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    // Non-number year
    response = await request(testEnv.expressServer.app).get('/this-01');
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    // Non-number year and month
    response = await request(testEnv.expressServer.app).get('/this-jan');
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');
  });

  test('Fail - Invalid month', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    let response = await request(testEnv.expressServer.app).get('/2022-13');
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    response = await request(testEnv.expressServer.app).get('/2022-00');
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');
  });

  test('Fail - Invalid year', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    const response = await request(testEnv.expressServer.app).get('/1997-6');
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');
  });
});
