/**
 * Jest unit test for POST /event/{eventID}/participate method
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

// eslint-disable-next-line node/no-unpublished-import
import * as request from 'supertest';
import TestEnv from '../../TestEnv';

describe('POST /event/{eventID}/participate - Create new participate', () => {
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

  test('Success - Three participation created', async () => {
    // Clear existing participation list
    await testEnv.dbClient.query('DELETE FROM participation');

    // All field
    let response = await request(testEnv.expressServer.app)
      .post('/event/1/participate')
      .send({
        participantName: '홍길동',
        phoneNumber: '01012345678',
        email: 'gildong@gmail.com',
        comment: 'test',
      });
    expect(response.status).toBe(200);

    // Same name, but different email, without comment
    response = await request(testEnv.expressServer.app)
      .post('/event/1/participate')
      .send({
        participantName: '홍길동',
        phoneNumber: '01012345678',
        email: 'gildong123@gmail.com',
      });
    expect(response.status).toBe(200);

    // Different name, same email, only required
    response = await request(testEnv.expressServer.app)
      .post('/event/1/participate')
      .send({participantName: '김길동', email: 'gildong@gmail.com'});
    expect(response.status).toBe(200);

    // DB Check
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM participation WHERE event_id = 1'
    );
    expect(queryResult.length).toBe(3);
    queryResult.forEach(
      (qr: {
        participant_name: string;
        email: string;
        phone_number?: string;
        comment?: string;
      }) => {
        if (qr.participant_name === '홍길동') {
          if (qr.email === 'gildong@gmail.com') {
            expect(qr.phone_number).toBe('01012345678');
            expect(qr.comment).toBe('test');
          } else if (qr.email === 'gildong123@gmail.com') {
            expect(qr.phone_number).toBe('01012345678');
            expect(qr.comment).toBeNull();
          } else {
            fail();
          }
        } else if (qr.participant_name === '김길동') {
          expect(qr.email).toBe('gildong@gmail.com');
          expect(qr.phone_number).toBeNull();
          expect(qr.comment).toBeNull();
        } else {
          fail();
        }
      }
    );
  });

  test('Success - Three participation created for different events', async () => {
    // Clear existing participation list
    await testEnv.dbClient.query('DELETE FROM participation');

    // Event 1
    let response = await request(testEnv.expressServer.app)
      .post('/event/1/participate')
      .send({
        participantName: '홍길동',
        phoneNumber: '01012345678',
        email: 'gildong@gmail.com',
        comment: 'test',
      });
    expect(response.status).toBe(200);
    // DB Check
    let queryResult = await testEnv.dbClient.query(
      'SELECT * FROM participation WHERE event_id = 1'
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].participant_name).toBe('홍길동');
    expect(queryResult[0].phone_number).toBe('01012345678');
    expect(queryResult[0].email).toBe('gildong@gmail.com');
    expect(queryResult[0].comment).toBe('test');

    // Event 2
    response = await request(testEnv.expressServer.app)
      .post('/event/2/participate')
      .send({
        participantName: '홍길동',
        phoneNumber: '01012345678',
        email: 'gildong@gmail.com',
        comment: 'test',
      });
    expect(response.status).toBe(200);
    // DB Check
    queryResult = await testEnv.dbClient.query(
      'SELECT * FROM participation WHERE event_id = 2'
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].participant_name).toBe('홍길동');
    expect(queryResult[0].phone_number).toBe('01012345678');
    expect(queryResult[0].email).toBe('gildong@gmail.com');
    expect(queryResult[0].comment).toBe('test');

    // Event 3
    response = await request(testEnv.expressServer.app)
      .post('/event/3/participate')
      .send({
        participantName: '홍길동',
        phoneNumber: '01012345678',
        email: 'gildong@gmail.com',
        comment: 'test',
      });
    expect(response.status).toBe(200);
    // DB Check
    queryResult = await testEnv.dbClient.query(
      'SELECT * FROM participation WHERE event_id = 3'
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].participant_name).toBe('홍길동');
    expect(queryResult[0].phone_number).toBe('01012345678');
    expect(queryResult[0].email).toBe('gildong@gmail.com');
    expect(queryResult[0].comment).toBe('test');
  });

  test('Success - Participation created on newly created event', async () => {
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
    const queryResult = await testEnv.dbClient.query(
      `SELECT * FROM participation WHERE event_id = ${eventId}`
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].participant_name).toBe('홍길동');
    expect(queryResult[0].phone_number).toBe('01012345678');
    expect(queryResult[0].email).toBe('gildong@gmail.com');
    expect(queryResult[0].comment).toBe('test');
  });

  test('Fail - Missing required field', async () => {
    // Missing participantName
    let response = await request(testEnv.expressServer.app)
      .post('/event/1/participate')
      .send({
        phoneNumber: '01012345678',
        email: 'gildong@gmail.com',
        comment: 'test',
      });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');
    // DB Check
    let queryResult = await testEnv.dbClient.query(
      'SELECT * FROM participation WHERE event_id = 1'
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].phone_number).not.toBe('01012345678');
    expect(queryResult[0].email).not.toBe('gildong@gmail.com');

    // Missing email
    response = await request(testEnv.expressServer.app)
      .post('/event/1/participate')
      .send({
        participantName: '홍길동',
        phoneNumber: '01012345678',
        comment: 'test',
      });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');
    // DB Check
    queryResult = await testEnv.dbClient.query(
      'SELECT * FROM participation WHERE event_id = 1'
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].phone_number).not.toBe('01012345678');
    expect(queryResult[0].participant_name).not.toBe('홍길동');
  });

  test('Fail - Contains additional field', async () => {
    // Having age
    const response = await request(testEnv.expressServer.app)
      .post('/event/1/participate')
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
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM participation WHERE event_id = 1'
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].phone_number).not.toBe('01012345678');
    expect(queryResult[0].email).not.toBe('gildong@gmail.com');
  });

  test('Fail - Invalid Event ID (Not a number, less than 1)', async () => {
    // Non-numeric key
    let response = await request(testEnv.expressServer.app)
      .post('/event/halloween/participate')
      .send({
        participantName: '홍길동',
        phoneNumber: '01012345678',
        email: 'gildong@gmail.com',
        comment: 'test',
      });
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');

    // key 0
    response = await request(testEnv.expressServer.app)
      .post('/event/0/participate')
      .send({
        participantName: '홍길동',
        phoneNumber: '01012345678',
        email: 'gildong@gmail.com',
        comment: 'test',
      });
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');

    // key -1
    response = await request(testEnv.expressServer.app)
      .post('/event/-1/participate')
      .send({
        participantName: '홍길동',
        phoneNumber: '01012345678',
        email: 'gildong@gmail.com',
        comment: 'test',
      });
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');

    // DB Check
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM participation'
    );
    expect(queryResult.length).toBe(4);
  });

  test('Fail - Not existing event id', async () => {
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
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM participation'
    );
    expect(queryResult.length).toBe(4);
  });

  test('Fail - Duplicated participation ticket', async () => {
    // Clear existing participation list
    await testEnv.dbClient.query('DELETE FROM participation');

    // Correct Request
    let response = await request(testEnv.expressServer.app)
      .post('/event/1/participate')
      .send({
        participantName: '홍길동',
        phoneNumber: '01012345678',
        email: 'gildong@gmail.com',
        comment: 'test',
      });
    expect(response.status).toBe(200);

    // Duplicated Request
    response = await request(testEnv.expressServer.app)
      .post('/event/1/participate')
      .send({
        participantName: '홍길동',
        email: 'gildong@gmail.com',
        comment: 'test',
      });
    expect(response.status).toBe(400);

    // DB Check
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM participation WHERE event_id = 1'
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].phone_number).toBe('01012345678');
    expect(queryResult[0].email).toBe('gildong@gmail.com');
    expect(queryResult[0].comment).toBe('test');
    expect(queryResult[0].participant_name).toBe('홍길동');
  });
});
