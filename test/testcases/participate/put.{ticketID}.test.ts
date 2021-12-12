/**
 * Jest unit test for PUT /event/{eventID}/participate/{ticketID} method
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

// eslint-disable-next-line node/no-unpublished-import
import * as request from 'supertest';
import * as Cosmos from '@azure/cosmos';
import TestEnv from '../../TestEnv';
import ExpressServer from '../../../src/ExpressServer';

describe('PUT /event/{eventID}/participate/{ticketID} - Edit an existing participation ticket', () => {
  let testEnv: TestEnv;
  let accessToken: string;

  // Information that used during the test
  const loginCredentials = {id: 'testuser1', password: 'Password13!'};

  // DB Container ID
  const EVENT = 'event';
  const PARTICIPATION = 'participation';

  beforeAll(() => {
    jest.setTimeout(120000);
  });

  beforeEach(async () => {
    // Setup test environment
    testEnv = new TestEnv(expect.getState().currentTestName);

    // Start Test Environment
    await testEnv.start();

    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Login
    const response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);
    accessToken = response.header['set-cookie'][0].split('; ')[0].split('=')[1];
  });

  afterEach(async () => {
    await testEnv.stop();
  });

  test('Success - Edit participant name', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Retrieve event ID and participation ID
    let dbOps = await testEnv.dbClient
      .container(EVENT)
      .items.query('SELECT e.id FROM event AS e WHERE e.name = "할로윈 파티"')
      .fetchAll();
    const eventId = dbOps.resources[0].id;
    dbOps = await testEnv.dbClient
      .container(PARTICIPATION)
      .items.query(
        `SELECT p.id FROM participation AS p WHERE p.participantName = "김영희" AND p.email = "yhkim@gmail.com" AND p.eventId = "${eventId}"`
      )
      .fetchAll();
    const participationId = dbOps.resources[0].id;

    // Update an participation
    const response = await request(testEnv.expressServer.app)
      .put(`/event/${eventId}/participate/${participationId}`)
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({participantName: '김철수'});
    expect(response.status).toBe(200);

    // DB Check
    const queryResult = await testEnv.dbClient
      .container(PARTICIPATION)
      .items.query(
        `SELECT * FROM participation AS p WHERE p.id = "${participationId}" AND p.eventId = "${eventId}"`
      )
      .fetchAll();
    expect(queryResult.resources.length).toBe(1);
    expect(new Date(queryResult.resources[0].createdAt).toISOString()).toBe(
      new Date('2021-08-17').toISOString()
    );
    expect(queryResult.resources[0].participantName).toBe('김철수');
    expect(queryResult.resources[0].phoneNumber).toBeUndefined();
    expect(queryResult.resources[0].email).toBe('yhkim@gmail.com');
    expect(queryResult.resources[0].comment).toBeUndefined();
  });

  test('Success - Edit phone number', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Retrieve event ID and participation ID
    let dbOps = await testEnv.dbClient
      .container(EVENT)
      .items.query('SELECT e.id FROM event AS e WHERE e.name = "할로윈 파티"')
      .fetchAll();
    const eventId = dbOps.resources[0].id;
    dbOps = await testEnv.dbClient
      .container(PARTICIPATION)
      .items.query(
        `SELECT p.id FROM participation AS p WHERE p.participantName = "김영희" AND p.email = "yhkim@gmail.com" AND p.eventId = "${eventId}"`
      )
      .fetchAll();
    const participationId = dbOps.resources[0].id;

    // Update an participation
    const response = await request(testEnv.expressServer.app)
      .put(`/event/${eventId}/participate/${participationId}`)
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({phoneNumber: '01012345678'});
    expect(response.status).toBe(200);

    // DB Check
    const queryResult = await testEnv.dbClient
      .container(PARTICIPATION)
      .items.query(
        `SELECT * FROM participation AS p WHERE p.id = "${participationId}" AND p.eventId = "${eventId}"`
      )
      .fetchAll();
    expect(queryResult.resources.length).toBe(1);
    expect(new Date(queryResult.resources[0].createdAt).toISOString()).toBe(
      new Date('2021-08-17').toISOString()
    );
    expect(queryResult.resources[0].participantName).toBe('김영희');
    expect(queryResult.resources[0].phoneNumber).toBe('01012345678');
    expect(queryResult.resources[0].email).toBe('yhkim@gmail.com');
    expect(queryResult.resources[0].comment).toBeUndefined();
  });

  test('Success - Edit email', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Retrieve event ID and participation ID
    let dbOps = await testEnv.dbClient
      .container(EVENT)
      .items.query('SELECT e.id FROM event AS e WHERE e.name = "할로윈 파티"')
      .fetchAll();
    const eventId = dbOps.resources[0].id;
    dbOps = await testEnv.dbClient
      .container(PARTICIPATION)
      .items.query(
        `SELECT p.id FROM participation AS p WHERE p.participantName = "김영희" AND p.email = "yhkim@gmail.com" AND p.eventId = "${eventId}"`
      )
      .fetchAll();
    const participationId = dbOps.resources[0].id;

    // Update an participation
    const response = await request(testEnv.expressServer.app)
      .put(`/event/${eventId}/participate/${participationId}`)
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({email: 'yhkim02@gmail.com'});
    expect(response.status).toBe(200);

    // DB Check
    const queryResult = await testEnv.dbClient
      .container(PARTICIPATION)
      .items.query(
        `SELECT * FROM participation AS p WHERE p.id = "${participationId}" AND p.eventId = "${eventId}"`
      )
      .fetchAll();
    expect(queryResult.resources.length).toBe(1);
    expect(new Date(queryResult.resources[0].createdAt).toISOString()).toBe(
      new Date('2021-08-17').toISOString()
    );
    expect(queryResult.resources[0].participantName).toBe('김영희');
    expect(queryResult.resources[0].phoneNumber).toBeUndefined();
    expect(queryResult.resources[0].email).toBe('yhkim02@gmail.com');
    expect(queryResult.resources[0].comment).toBeUndefined();
  });

  test('Success - Edit comment', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Retrieve event ID and participation ID
    let dbOps = await testEnv.dbClient
      .container(EVENT)
      .items.query('SELECT e.id FROM event AS e WHERE e.name = "할로윈 파티"')
      .fetchAll();
    const eventId = dbOps.resources[0].id;
    dbOps = await testEnv.dbClient
      .container(PARTICIPATION)
      .items.query(
        `SELECT p.id FROM participation AS p WHERE p.participantName = "김영희" AND p.email = "yhkim@gmail.com" AND p.eventId = "${eventId}"`
      )
      .fetchAll();
    const participationId = dbOps.resources[0].id;

    // Update an participation
    const response = await request(testEnv.expressServer.app)
      .put(`/event/${eventId}/participate/${participationId}`)
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({comment: '1명 추가 신청합니다.'});
    expect(response.status).toBe(200);

    // DB Check
    const queryResult = await testEnv.dbClient
      .container(PARTICIPATION)
      .items.query(
        `SELECT * FROM participation AS p WHERE p.id = "${participationId}" AND p.eventId = "${eventId}"`
      )
      .fetchAll();
    expect(queryResult.resources.length).toBe(1);
    expect(new Date(queryResult.resources[0].createdAt).toISOString()).toBe(
      new Date('2021-08-17').toISOString()
    );
    expect(queryResult.resources[0].participantName).toBe('김영희');
    expect(queryResult.resources[0].phoneNumber).toBeUndefined();
    expect(queryResult.resources[0].email).toBe('yhkim@gmail.com');
    expect(queryResult.resources[0].comment).toBe('1명 추가 신청합니다.');
  });

  test('Success - Edit numerous properties', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Retrieve event ID and participation ID
    let dbOps = await testEnv.dbClient
      .container(EVENT)
      .items.query('SELECT e.id FROM event AS e WHERE e.name = "할로윈 파티"')
      .fetchAll();
    const eventId = dbOps.resources[0].id;
    dbOps = await testEnv.dbClient
      .container(PARTICIPATION)
      .items.query(
        `SELECT p.id FROM participation AS p WHERE p.participantName = "김영희" AND p.email = "yhkim@gmail.com" AND p.eventId = "${eventId}"`
      )
      .fetchAll();
    const participationId = dbOps.resources[0].id;

    // Update an participation
    const response = await request(testEnv.expressServer.app)
      .put(`/event/${eventId}/participate/${participationId}`)
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({
        comment: '1명 추가 신청합니다.',
        email: 'yhkim02@gmail.com',
        phoneNumber: '01012345678',
      });
    expect(response.status).toBe(200);

    // DB Check
    const queryResult = await testEnv.dbClient
      .container(PARTICIPATION)
      .items.query(
        `SELECT * FROM participation AS p WHERE p.id = "${participationId}" AND p.eventId = "${eventId}"`
      )
      .fetchAll();
    expect(queryResult.resources.length).toBe(1);
    expect(new Date(queryResult.resources[0].createdAt).toISOString()).toBe(
      new Date('2021-08-17').toISOString()
    );
    expect(queryResult.resources[0].participantName).toBe('김영희');
    expect(queryResult.resources[0].phoneNumber).toBe('01012345678');
    expect(queryResult.resources[0].email).toBe('yhkim02@gmail.com');
    expect(queryResult.resources[0].comment).toBe('1명 추가 신청합니다.');
  });

  test('Fail - Invalid phone number format', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Retrieve event ID and participation ID
    let dbOps = await testEnv.dbClient
      .container(EVENT)
      .items.query('SELECT e.id FROM event AS e WHERE e.name = "할로윈 파티"')
      .fetchAll();
    const eventId = dbOps.resources[0].id;
    dbOps = await testEnv.dbClient
      .container(PARTICIPATION)
      .items.query(
        `SELECT p.id FROM participation AS p WHERE p.participantName = "김영희" AND p.email = "yhkim@gmail.com" AND p.eventId = "${eventId}"`
      )
      .fetchAll();
    const participationId = dbOps.resources[0].id;

    // Update an participation
    const response = await request(testEnv.expressServer.app)
      .put(`/event/${eventId}/participate/${participationId}`)
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({phoneNumber: '010-1234-5678'});
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    // DB Check
    const queryResult = await testEnv.dbClient
      .container(PARTICIPATION)
      .items.query(
        `SELECT * FROM participation AS p WHERE p.id = "${participationId}" AND p.eventId = "${eventId}"`
      )
      .fetchAll();
    expect(queryResult.resources.length).toBe(1);
    expect(new Date(queryResult.resources[0].createdAt).toISOString()).toBe(
      new Date('2021-08-17').toISOString()
    );
    expect(queryResult.resources[0].participantName).toBe('김영희');
    expect(queryResult.resources[0].phoneNumber).toBeUndefined();
    expect(queryResult.resources[0].email).toBe('yhkim@gmail.com');
    expect(queryResult.resources[0].comment).toBeUndefined();
  });

  test('Fail - Invalid email format', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Retrieve event ID and participation ID
    let dbOps = await testEnv.dbClient
      .container(EVENT)
      .items.query('SELECT e.id FROM event AS e WHERE e.name = "할로윈 파티"')
      .fetchAll();
    const eventId = dbOps.resources[0].id;
    dbOps = await testEnv.dbClient
      .container(PARTICIPATION)
      .items.query(
        `SELECT p.id FROM participation AS p WHERE p.participantName = "김영희" AND p.email = "yhkim@gmail.com" AND p.eventId = "${eventId}"`
      )
      .fetchAll();
    const participationId = dbOps.resources[0].id;

    // Update an participation
    const response = await request(testEnv.expressServer.app)
      .put(`/event/${eventId}/participate/${participationId}`)
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({email: 'yhkim02@gmail'});
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    // DB Check
    const queryResult = await testEnv.dbClient
      .container(PARTICIPATION)
      .items.query(
        `SELECT * FROM participation AS p WHERE p.id = "${participationId}" AND p.eventId = "${eventId}"`
      )
      .fetchAll();
    expect(queryResult.resources.length).toBe(1);
    expect(new Date(queryResult.resources[0].createdAt).toISOString()).toBe(
      new Date('2021-08-17').toISOString()
    );
    expect(queryResult.resources[0].participantName).toBe('김영희');
    expect(queryResult.resources[0].phoneNumber).toBeUndefined();
    expect(queryResult.resources[0].email).toBe('yhkim@gmail.com');
    expect(queryResult.resources[0].comment).toBeUndefined();
  });

  test('Fail - Additional field', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Retrieve event ID and participation ID
    let dbOps = await testEnv.dbClient
      .container(EVENT)
      .items.query('SELECT e.id FROM event AS e WHERE e.name = "할로윈 파티"')
      .fetchAll();
    const eventId = dbOps.resources[0].id;
    dbOps = await testEnv.dbClient
      .container(PARTICIPATION)
      .items.query(
        `SELECT p.id FROM participation AS p WHERE p.participantName = "김영희" AND p.email = "yhkim@gmail.com" AND p.eventId = "${eventId}"`
      )
      .fetchAll();
    const participationId = dbOps.resources[0].id;

    // Update an participation
    const response = await request(testEnv.expressServer.app)
      .put(`/event/${eventId}/participate/${participationId}`)
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({email: 'yhkim02@gmail.com', nickname: '영희'});
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    // DB Check
    const queryResult = await testEnv.dbClient
      .container(PARTICIPATION)
      .items.query(
        `SELECT * FROM participation AS p WHERE p.id = "${participationId}" AND p.eventId = "${eventId}"`
      )
      .fetchAll();
    expect(queryResult.resources.length).toBe(1);
    expect(new Date(queryResult.resources[0].createdAt).toISOString()).toBe(
      new Date('2021-08-17').toISOString()
    );
    expect(queryResult.resources[0].participantName).toBe('김영희');
    expect(queryResult.resources[0].phoneNumber).toBeUndefined();
    expect(queryResult.resources[0].email).toBe('yhkim@gmail.com');
    expect(queryResult.resources[0].comment).toBeUndefined();
  });

  test('Fail - Unauthorized', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Retrieve event ID and participation ID
    let dbOps = await testEnv.dbClient
      .container(EVENT)
      .items.query('SELECT e.id FROM event AS e WHERE e.name = "할로윈 파티"')
      .fetchAll();
    const eventId = dbOps.resources[0].id;
    dbOps = await testEnv.dbClient
      .container(PARTICIPATION)
      .items.query(
        `SELECT p.id FROM participation AS p WHERE p.participantName = "김영희" AND p.email = "yhkim@gmail.com" AND p.eventId = "${eventId}"`
      )
      .fetchAll();
    const participationId = dbOps.resources[0].id;

    // Update an participation
    const response = await request(testEnv.expressServer.app)
      .put(`/event/${eventId}/participate/${participationId}`)
      .send({phoneNumber: '01012345678'});
    expect(response.status).toBe(401);
    expect(response.body.error).toBe(
      'Authentication information is missing/invalid'
    );

    // DB Check
    const queryResult = await testEnv.dbClient
      .container(PARTICIPATION)
      .items.query(
        `SELECT * FROM participation AS p WHERE p.id = "${participationId}" AND p.eventId = "${eventId}"`
      )
      .fetchAll();
    expect(queryResult.resources.length).toBe(1);
    expect(new Date(queryResult.resources[0].createdAt).toISOString()).toBe(
      new Date('2021-08-17').toISOString()
    );
    expect(queryResult.resources[0].participantName).toBe('김영희');
    expect(queryResult.resources[0].phoneNumber).toBeUndefined();
    expect(queryResult.resources[0].email).toBe('yhkim@gmail.com');
    expect(queryResult.resources[0].comment).toBeUndefined();
  });

  test('Fail - eventID Not found', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Event Not Exist
    const response = await request(testEnv.expressServer.app)
      .put('/event/100/participate/1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({participantName: '김철수'});
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');
  });

  test('Fail - ticketID Not found', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Event Not Exist
    const response = await request(testEnv.expressServer.app)
      .put('/event/1/participate/100')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({participantName: '김철수'});
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');
  });
});
