/**
 * Jest unit test for DELETE /event/{eventID}/participate/{ticketID} method
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

// eslint-disable-next-line node/no-unpublished-import
import * as request from 'supertest';
import * as Cosmos from '@azure/cosmos';
import TestEnv from '../../TestEnv';
import ExpressServer from '../../../src/ExpressServer';

describe('DELETE /event/{eventID}/participate/{ticketID} - Delete an existing event participation', () => {
  let testEnv: TestEnv;
  let accessToken: string;

  // DB Container ID
  const EVENT = 'event';
  const PARTICIPATION = 'participation';

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

    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Admin login to get access token
    const response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);
    accessToken = response.header['set-cookie'][0].split('; ')[0].split('=')[1];
  });

  afterEach(async () => {
    await testEnv.stop();
  });

  test('Success - Delete an existing participation', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Retrieve event ID and participation ID
    let dbOps = await testEnv.dbClient
      .container(EVENT)
      .items.query(
        'SELECT e.id FROM event AS e WHERE e.name = "비대면 정기 모임"'
      )
      .fetchAll();
    const eventId = dbOps.resources[0].id;
    dbOps = await testEnv.dbClient
      .container(PARTICIPATION)
      .items.query(
        'SELECT p.id FROM participation AS p WHERE p.participantName = "김말숙" AND p.email = "mskim@gmail.com"'
      )
      .fetchAll();
    const participationId = dbOps.resources[0].id;

    // Remove an existing participation
    const response = await request(testEnv.expressServer.app)
      .delete(`/event/${eventId}/participate/${participationId}`)
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send();
    expect(response.status).toBe(200);

    // DB Check
    const queryResult = await testEnv.dbClient
      .container(PARTICIPATION)
      .items.query(
        `SELECT * FROM participation AS p WHERE p.eventId = "${eventId}"`
      )
      .fetchAll();
    expect(queryResult.resources.length).toBe(1);
    expect(queryResult.resources[0].participantName).toBe('김영희');
    expect(queryResult.resources[0].phoneNumber).toBe('01012345678');
    expect(queryResult.resources[0].email).toBe('yhkim@gmail.com');
    expect(queryResult.resources[0].comment).toBe('음 계정은 yhkim 입니다.');
  });

  test('Success - Delete a newly created participation on existing event', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    const dbOps = await testEnv.dbClient
      .container(EVENT)
      .items.query(
        'SELECT e.id FROM event AS e WHERE e.name = "비대면 정기 모임"'
      )
      .fetchAll();
    const eventId = dbOps.resources[0].id;

    const createdAt = new Date();
    // Create new participation on existing event
    let response = await request(testEnv.expressServer.app)
      .post(`/event/${eventId}/participate`)
      .send({
        participantName: '홍길동',
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
    expect(queryResult.resources.length).toBe(3);
    const result = queryResult.resources.filter(
      (qr: {createdAt: string}) => new Date(qr.createdAt) >= createdAt
    );
    expect(result[0].participantName).toBe('홍길동');
    expect(result[0].phoneNumber).toBeUndefined();
    expect(result[0].email).toBe('gildong@gmail.com');
    expect(result[0].comment).toBe('test');
    const participationId = result[0].id;

    // Delete participation
    response = await request(testEnv.expressServer.app)
      .delete(`/event/${eventId}/participate/${participationId}`)
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send();
    expect(response.status).toBe(200);

    // DB Check
    queryResult = await testEnv.dbClient
      .container(PARTICIPATION)
      .items.query(
        `SELECT * FROM participation AS p WHERE p.eventId = "${eventId}"`
      )
      .fetchAll();
    expect(queryResult.resources.length).toBe(2);
  });

  test('Success - Delete a newly created participation on new event', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Create new event
    let response = await request(testEnv.expressServer.app)
      .post('/event')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({year: 2022, month: 1, date: 1, name: '신년 해돋이'});
    expect(response.status).toBe(200);

    // Get Event ID
    response = await request(testEnv.expressServer.app).get('/2022-1');
    expect(response.status).toBe(200);
    const eventId = response.body.eventList[0].id;

    // Create new participation
    response = await request(testEnv.expressServer.app)
      .post(`/event/${eventId}/participate`)
      .send({
        participantName: '홍길동',
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
    expect(queryResult.resources[0].phoneNumber).toBeUndefined();
    expect(queryResult.resources[0].email).toBe('gildong@gmail.com');
    expect(queryResult.resources[0].comment).toBe('test');
    const participationId = queryResult.resources[0].id;

    // Remove participation
    response = await request(testEnv.expressServer.app)
      .delete(`/event/${eventId}/participate/${participationId}`)
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send();
    expect(response.status).toBe(200);

    // DB Check
    queryResult = await testEnv.dbClient
      .container(PARTICIPATION)
      .items.query(
        `SELECT * FROM participation AS p WHERE p.eventId = "${eventId}"`
      )
      .fetchAll();
    expect(queryResult.resources.length).toBe(0);
  });

  test('Success - Delete participation with duplicated participation name and email', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    let dbOps = await testEnv.dbClient
      .container(EVENT)
      .items.query(
        'SELECT e.id FROM event AS e WHERE e.name = "비대면 정기 모임"'
      )
      .fetchAll();
    let eventId = dbOps.resources[0].id;
    dbOps = await testEnv.dbClient
      .container(PARTICIPATION)
      .items.query(
        `SELECT p.id FROM participation AS p WHERE p.participantName = "김영희" AND p.email = "yhkim@gmail.com" AND p.eventId = "${eventId}"`
      )
      .fetchAll();
    const participationId = dbOps.resources[0].id;

    // Delete event
    const response = await request(testEnv.expressServer.app)
      .delete(`/event/${eventId}/participate/${participationId}`)
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send();
    expect(response.status).toBe(200);

    // DB Check - event 3's participation 2 should be removed,
    let queryResult = await testEnv.dbClient
      .container(PARTICIPATION)
      .items.query(
        `SELECT * FROM participation AS p WHERE p.eventId = "${eventId}"`
      )
      .fetchAll();
    expect(queryResult.resources.length).toBe(1);

    // event 1's participation 1 should exist.
    // Get Event ID
    dbOps = await testEnv.dbClient
      .container(EVENT)
      .items.query('SELECT e.id FROM event AS e WHERE e.name = "할로윈 파티"')
      .fetchAll();
    eventId = dbOps.resources[0].id;
    // DB Check
    queryResult = await testEnv.dbClient
      .container(PARTICIPATION)
      .items.query(
        `SELECT * FROM participation AS p WHERE p.eventId = "${eventId}"`
      )
      .fetchAll();
    expect(queryResult.resources.length).toBe(1);
    expect(queryResult.resources[0].eventId).toBe(eventId);
    expect(queryResult.resources[0].participantName).toBe('김영희');
    expect(queryResult.resources[0].phoneNumber).toBeUndefined();
    expect(queryResult.resources[0].email).toBe('yhkim@gmail.com');
    expect(queryResult.resources[0].comment).toBeUndefined();
  });

  test('Fail - Not authorized user', async () => {
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

    // Delete event (Without token)
    const response = await request(testEnv.expressServer.app)
      .delete(`/event/${eventId}/participate/${participationId}`)
      .set('Cookie', ['X-ACCESS-TOKEN='])
      .send();
    expect(response.status).toBe(401);
    expect(response.body.error).toBe(
      'Authentication information is missing/invalid'
    );

    // Event 1 - Participation 1 should not be removed
    const queryResult = await testEnv.dbClient
      .container(PARTICIPATION)
      .items.query(
        `SELECT * FROM participation AS p WHERE p.id = "${participationId}"`
      )
      .fetchAll();
    expect(queryResult.resources.length).toBe(1);
    expect(queryResult.resources[0].eventId).toBe(eventId);
    expect(queryResult.resources[0].participantName).toBe('김영희');
    expect(queryResult.resources[0].phoneNumber).toBeUndefined();
    expect(queryResult.resources[0].email).toBe('yhkim@gmail.com');
    expect(queryResult.resources[0].comment).toBeUndefined();
  });

  test('Fail - Event ID not found', async () => {
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

    // Delete event
    const response = await request(testEnv.expressServer.app)
      .delete(`/event/100/participate/${participationId}`)
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send();
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');

    // DB Check
    // Participation #1 should not be removed
    const queryResult = await testEnv.dbClient
      .container(PARTICIPATION)
      .items.query(
        `SELECT * FROM participation AS p WHERE p.id = "${participationId}"`
      )
      .fetchAll();
    expect(queryResult.resources.length).toBe(1);
    expect(queryResult.resources[0].eventId).toBe(eventId);
    expect(queryResult.resources[0].participantName).toBe('김영희');
    expect(queryResult.resources[0].phoneNumber).toBeUndefined();
    expect(queryResult.resources[0].email).toBe('yhkim@gmail.com');
    expect(queryResult.resources[0].comment).toBeUndefined();
  });

  test('Fail - Participation ID not found', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Retrieve event ID and participation ID
    const dbOps = await testEnv.dbClient
      .container(EVENT)
      .items.query(
        'SELECT e.id FROM event AS e WHERE e.name = "비대면 정기 모임"'
      )
      .fetchAll();
    const eventId = dbOps.resources[0].id;

    // Delete event
    const response = await request(testEnv.expressServer.app)
      .delete(`/event/${eventId}/participate/100`)
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send();
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');

    // DB Check - Event 3's participation ticket should not be removed
    const queryResult = await testEnv.dbClient
      .container(PARTICIPATION)
      .items.query(
        `SELECT * FROM participation AS p WHERE p.eventId = "${eventId}"`
      )
      .fetchAll();
    expect(queryResult.resources.length).toBe(2);
  });

  test('Fail - Participation not associated with the event', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Retrieve event ID and participation ID
    let dbOps = await testEnv.dbClient
      .container(EVENT)
      .items.query(
        'SELECT e.id FROM event AS e WHERE e.name = "비대면 정기 모임"'
      )
      .fetchAll();
    const eventId = dbOps.resources[0].id;
    dbOps = await testEnv.dbClient
      .container(EVENT)
      .items.query('SELECT e.id FROM event AS e WHERE e.name = "할로윈 파티"')
      .fetchAll();
    const tempEventId = dbOps.resources[0].id;
    dbOps = await testEnv.dbClient
      .container(PARTICIPATION)
      .items.query(
        `SELECT p.id FROM participation AS p WHERE p.participantName = "김영희" AND p.email = "yhkim@gmail.com" AND p.eventId = "${tempEventId}"`
      )
      .fetchAll();
    const participationId = dbOps.resources[0].id;

    // Delete event
    const response = await request(testEnv.expressServer.app)
      .delete(`/event/${eventId}/participate/${participationId}`)
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send();
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');

    // DB Check
    // Either participation #1 and event 3's participation should not be removed
    let queryResult = await testEnv.dbClient
      .container(PARTICIPATION)
      .items.query(
        `SELECT * FROM participation AS p WHERE p.id = "${participationId}"`
      )
      .fetchAll();
    expect(queryResult.resources.length).toBe(1);
    expect(queryResult.resources[0].eventId).toBe(tempEventId);
    expect(queryResult.resources[0].participantName).toBe('김영희');
    expect(queryResult.resources[0].phoneNumber).toBeUndefined();
    expect(queryResult.resources[0].email).toBe('yhkim@gmail.com');
    expect(queryResult.resources[0].comment).toBeUndefined();
    queryResult = await testEnv.dbClient
      .container(PARTICIPATION)
      .items.query(
        `SELECT * FROM participation AS p WHERE p.eventId = "${eventId}"`
      )
      .fetchAll();
    expect(queryResult.resources.length).toBe(2);
  });
});
