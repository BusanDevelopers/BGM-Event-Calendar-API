/**
 * Jest unit test for POST /event/{eventID}/participate method
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

// eslint-disable-next-line node/no-unpublished-import
import * as request from 'supertest';
import * as Cosmos from '@azure/cosmos';
// eslint-disable-next-line node/no-unpublished-import
import * as MockDate from 'mockdate';
import TestEnv from '../../TestEnv';
import ExpressServer from '../../../src/ExpressServer';

describe('POST /event/{eventID}/participate - Create new participate', () => {
  let testEnv: TestEnv;

  // DB Container ID
  const EVENT = 'event';
  const PARTICIPATION = 'participation';
  // DB collection obtion
  const option: Cosmos.ContainerRequest = {
    id: 'participation',
    partitionKey: {paths: ['/eventId']},
    uniqueKeyPolicy: {
      uniqueKeys: [{paths: ['/eventId', '/participantName', '/email']}],
    },
    indexingPolicy: {
      indexingMode: 'consistent',
      automatic: true,
      includedPaths: [
        {path: '/eventId/?'},
        {path: '/participantName/?'},
        {path: '/email/?'},
      ],
      excludedPaths: [{path: '/*'}, {path: '/"_etag"/?'}],
    },
  };

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

  test('Success - Three participation created', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Clear existing participation list
    await testEnv.dbClient.container(PARTICIPATION).delete();
    await testEnv.dbClient.containers.create(option);

    // Retrieve event ID
    const dbOps = await testEnv.dbClient
      .container(EVENT)
      .items.query('SELECT e.id FROM event AS e WHERE e.name = "할로윈 파티"')
      .fetchAll();
    const eventId = dbOps.resources[0].id;

    // All field
    let response = await request(testEnv.expressServer.app)
      .post(`/event/${eventId}/participate`)
      .send({
        participantName: '홍길동',
        phoneNumber: '01012345678',
        email: 'gildong@gmail.com',
        comment: 'test',
      });
    expect(response.status).toBe(200);

    // Same name, but different email, without comment
    response = await request(testEnv.expressServer.app)
      .post(`/event/${eventId}/participate`)
      .send({
        participantName: '홍길동',
        phoneNumber: '01012345678',
        email: 'gildong123@gmail.com',
      });
    expect(response.status).toBe(200);

    // Different name, same email, only required
    response = await request(testEnv.expressServer.app)
      .post(`/event/${eventId}/participate`)
      .send({participantName: '김길동', email: 'gildong@gmail.com'});
    expect(response.status).toBe(200);

    // DB Check
    const queryResult = await testEnv.dbClient
      .container(PARTICIPATION)
      .items.query(
        `SELECT * FROM participation AS p WHERE p.eventId = "${eventId}"`
      )
      .fetchAll();
    expect(queryResult.resources.length).toBe(3);
    queryResult.resources.forEach(
      (qr: {
        participantName: string;
        email: string;
        phoneNumber?: string;
        comment?: string;
      }) => {
        if (qr.participantName === '홍길동') {
          if (qr.email === 'gildong@gmail.com') {
            expect(qr.phoneNumber).toBe('01012345678');
            expect(qr.comment).toBe('test');
          } else if (qr.email === 'gildong123@gmail.com') {
            expect(qr.phoneNumber).toBe('01012345678');
            expect(qr.comment).toBeUndefined();
          } else {
            fail();
          }
        } else if (qr.participantName === '김길동') {
          expect(qr.email).toBe('gildong@gmail.com');
          expect(qr.phoneNumber).toBeUndefined();
          expect(qr.comment).toBeUndefined();
        } else {
          fail();
        }
      }
    );
  });

  test('Success - Three participation created for different events', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Clear existing participation list
    await testEnv.dbClient.container(PARTICIPATION).delete();
    await testEnv.dbClient.containers.create(option);

    // Retrieve event ID
    let dbOps = await testEnv.dbClient
      .container(EVENT)
      .items.query('SELECT e.id FROM event AS e WHERE e.name = "할로윈 파티"')
      .fetchAll();
    let eventId = dbOps.resources[0].id;
    // Event 1
    let response = await request(testEnv.expressServer.app)
      .post(`/event/${eventId}/participate`)
      .send({
        participantName: '홍길동',
        phoneNumber: '01012345678',
        email: 'gildong@gmail.com',
        comment: 'test',
      });
    expect(response.status).toBe(200);
    // DB Check
    let queryResult = await testEnv.dbClient
      .container(PARTICIPATION)
      .items.query(
        `SELECT * FROM participation AS p WHERE p.eventId = "${eventId}"`
      )
      .fetchAll();
    expect(queryResult.resources.length).toBe(1);
    expect(queryResult.resources[0].participantName).toBe('홍길동');
    expect(queryResult.resources[0].phoneNumber).toBe('01012345678');
    expect(queryResult.resources[0].email).toBe('gildong@gmail.com');
    expect(queryResult.resources[0].comment).toBe('test');

    // Retrieve event ID
    dbOps = await testEnv.dbClient
      .container(EVENT)
      .items.query('SELECT e.id FROM event AS e WHERE e.name = "광복절"')
      .fetchAll();
    eventId = dbOps.resources[0].id;
    // Event 2
    response = await request(testEnv.expressServer.app)
      .post(`/event/${eventId}/participate`)
      .send({
        participantName: '홍길동',
        phoneNumber: '01012345678',
        email: 'gildong@gmail.com',
        comment: 'test',
      });
    expect(response.status).toBe(200);
    // DB Check
    queryResult = await testEnv.dbClient
      .container(PARTICIPATION)
      .items.query(
        `SELECT * FROM participation AS p WHERE p.eventId = "${eventId}"`
      )
      .fetchAll();
    expect(queryResult.resources.length).toBe(1);
    expect(queryResult.resources[0].participantName).toBe('홍길동');
    expect(queryResult.resources[0].phoneNumber).toBe('01012345678');
    expect(queryResult.resources[0].email).toBe('gildong@gmail.com');
    expect(queryResult.resources[0].comment).toBe('test');

    // Retrieve event ID
    dbOps = await testEnv.dbClient
      .container(EVENT)
      .items.query(
        'SELECT e.id FROM event AS e WHERE e.name = "비대면 정기 모임"'
      )
      .fetchAll();
    eventId = dbOps.resources[0].id;
    // Event 3
    response = await request(testEnv.expressServer.app)
      .post(`/event/${eventId}/participate`)
      .send({
        participantName: '홍길동',
        phoneNumber: '01012345678',
        email: 'gildong@gmail.com',
        comment: 'test',
      });
    expect(response.status).toBe(200);
    // DB Check
    queryResult = await testEnv.dbClient
      .container(PARTICIPATION)
      .items.query(
        `SELECT * FROM participation AS p WHERE p.eventId = "${eventId}"`
      )
      .fetchAll();
    expect(queryResult.resources.length).toBe(1);
    expect(queryResult.resources[0].participantName).toBe('홍길동');
    expect(queryResult.resources[0].phoneNumber).toBe('01012345678');
    expect(queryResult.resources[0].email).toBe('gildong@gmail.com');
    expect(queryResult.resources[0].comment).toBe('test');
  });

  test('Success - Participation created on newly created event', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Information that used during the test
    const loginCredentials = {id: 'testuser1', password: 'Password13!'};
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

    // Register an event
    response = await request(testEnv.expressServer.app)
      .post('/event')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send(requiredPayload);
    expect(response.status).toBe(200);

    // Get the event id
    response = await request(testEnv.expressServer.app).get('/2022-1');
    expect(response.status).toBe(200);
    const eventId = response.body.eventList[0].id;

    // Register a participation ticket
    response = await request(testEnv.expressServer.app)
      .post(`/event/${eventId}/participate`)
      .send({
        participantName: '홍길동',
        phoneNumber: '01012345678',
        email: 'gildong@gmail.com',
        comment: 'test',
      });
    expect(response.status).toBe(200);

    // DB Check
    const queryResult = await testEnv.dbClient
      .container(PARTICIPATION)
      .items.query(
        `SELECT * FROM participation AS p WHERE p.eventId = "${eventId}"`
      )
      .fetchAll();
    expect(queryResult.resources.length).toBe(1);
    expect(queryResult.resources[0].participantName).toBe('홍길동');
    expect(queryResult.resources[0].phoneNumber).toBe('01012345678');
    expect(queryResult.resources[0].email).toBe('gildong@gmail.com');
    expect(queryResult.resources[0].comment).toBe('test');
  });

  test('Fail - Missing required field', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Retrieve event ID
    const dbOps = await testEnv.dbClient
      .container(EVENT)
      .items.query('SELECT e.id FROM event AS e WHERE e.name = "할로윈 파티"')
      .fetchAll();
    const eventId = dbOps.resources[0].id;

    // Missing participantName
    let response = await request(testEnv.expressServer.app)
      .post(`/event/${eventId}/participate`)
      .send({
        phoneNumber: '01012345678',
        email: 'gildong@gmail.com',
        comment: 'test',
      });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');
    // DB Check
    let queryResult = await testEnv.dbClient
      .container(PARTICIPATION)
      .items.query(
        `SELECT * FROM participation AS p WHERE p.eventId = "${eventId}"`
      )
      .fetchAll();
    expect(queryResult.resources.length).toBe(1);
    expect(queryResult.resources[0].phoneNumber).not.toBe('01012345678');
    expect(queryResult.resources[0].email).not.toBe('gildong@gmail.com');

    // Missing email
    response = await request(testEnv.expressServer.app)
      .post(`/event/${eventId}/participate`)
      .send({
        participantName: '홍길동',
        phoneNumber: '01012345678',
        comment: 'test',
      });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');
    // DB Check
    queryResult = await testEnv.dbClient
      .container(PARTICIPATION)
      .items.query(
        `SELECT * FROM participation AS p WHERE p.eventId = "${eventId}"`
      )
      .fetchAll();
    expect(queryResult.resources.length).toBe(1);
    expect(queryResult.resources[0].phoneNumber).not.toBe('01012345678');
    expect(queryResult.resources[0].participantName).not.toBe('홍길동');
  });

  test('Fail - Phone number pattern not valid', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Retrieve event ID
    const dbOps = await testEnv.dbClient
      .container(EVENT)
      .items.query(
        'SELECT e.id FROM event AS e WHERE e.name = "비대면 정기 모임"'
      )
      .fetchAll();
    const eventId = dbOps.resources[0].id;

    // Request - Having hyphen
    let response = await request(testEnv.expressServer.app)
      .post(`/event/${eventId}/participate`)
      .send({
        participantName: '홍길동',
        phoneNumber: '010-1234-5678',
        email: 'gildong@gmail.com',
        comment: 'test',
      });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    // Request - Not a mobile number
    response = await request(testEnv.expressServer.app)
      .post(`/event/${eventId}/participate`)
      .send({
        participantName: '홍길동',
        phoneNumber: '07012345678',
        email: 'gildong@gmail.com',
        comment: 'test',
      });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    // DB Check
    const queryResult = await testEnv.dbClient
      .container(PARTICIPATION)
      .items.query(
        `SELECT * FROM participation AS p WHERE p.eventId = "${eventId}"`
      )
      .fetchAll();
    expect(queryResult.resources.length).toBe(2);
  });

  test('Fail - Contains additional field', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Retrieve event ID
    const dbOps = await testEnv.dbClient
      .container(EVENT)
      .items.query('SELECT e.id FROM event AS e WHERE e.name = "할로윈 파티"')
      .fetchAll();
    const eventId = dbOps.resources[0].id;

    // Having age
    const response = await request(testEnv.expressServer.app)
      .post(`/event/${eventId}/participate`)
      .send({
        participantName: '홍길동',
        phoneNumber: '01012345678',
        email: 'gildong@gmail.com',
        comment: 'test',
        age: 22,
      });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');
    // DB Check
    const queryResult = await testEnv.dbClient
      .container(PARTICIPATION)
      .items.query(
        `SELECT * FROM participation AS p WHERE p.eventId = "${eventId}"`
      )
      .fetchAll();
    expect(queryResult.resources.length).toBe(1);
    expect(queryResult.resources[0].phoneNumber).not.toBe('01012345678');
    expect(queryResult.resources[0].email).not.toBe('gildong@gmail.com');
  });

  test('Fail - Not existing event id', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Request
    const response = await request(testEnv.expressServer.app)
      .post('/event/100/participate')
      .send({
        participantName: '홍길동',
        phoneNumber: '01012345678',
        email: 'gildong@gmail.com',
        comment: 'test',
      });
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');

    // DB Check
    const queryResult = await testEnv.dbClient
      .container(PARTICIPATION)
      .items.query('SELECT * FROM participation')
      .fetchAll();
    expect(queryResult.resources.length).toBe(4);
  });

  test('Fail - Duplicated participation ticket', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Clear existing participation list
    await testEnv.dbClient.container(PARTICIPATION).delete();
    await testEnv.dbClient.containers.create(option);

    // Retrieve event ID
    const dbOps = await testEnv.dbClient
      .container(EVENT)
      .items.query('SELECT e.id FROM event AS e WHERE e.name = "할로윈 파티"')
      .fetchAll();
    const eventId = dbOps.resources[0].id;

    // Correct Request
    const currentDate = new Date();
    MockDate.set(currentDate);
    let response = await request(testEnv.expressServer.app)
      .post(`/event/${eventId}/participate`)
      .send({
        participantName: '홍길동',
        phoneNumber: '01012345678',
        email: 'gildong@gmail.com',
        comment: 'test',
      });
    expect(response.status).toBe(200);

    // Duplicated Request
    currentDate.setMinutes(currentDate.getMinutes() + 1);
    MockDate.set(currentDate);
    response = await request(testEnv.expressServer.app)
      .post(`'/event/${eventId}/participate`)
      .send({
        participantName: '홍길동',
        email: 'gildong@gmail.com',
        comment: 'test',
      });
    expect(response.status).toBe(400);

    // DB Check
    const queryResult = await testEnv.dbClient
      .container(PARTICIPATION)
      .items.query(
        `SELECT * FROM participation AS p WHERE p.eventId = "${eventId}"`
      )
      .fetchAll();
    expect(queryResult.resources.length).toBe(1);
    expect(queryResult.resources[0].phoneNumber).toBe('01012345678');
    expect(queryResult.resources[0].email).toBe('gildong@gmail.com');
    expect(queryResult.resources[0].comment).toBe('test');
    expect(queryResult.resources[0].participantName).toBe('홍길동');
  });
});
