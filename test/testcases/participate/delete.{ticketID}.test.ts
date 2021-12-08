/**
 * Jest unit test for DELETE /event/{eventID}/participate/{ticketID} method
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

// eslint-disable-next-line node/no-unpublished-import
import * as request from 'supertest';
import TestEnv from '../../TestEnv';

describe('DELETE /event/{eventID}/participate/{ticketID} - Delete an existing event participation', () => {
  let testEnv: TestEnv;
  let accessToken: string;

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
    // Remove an existing participation
    const response = await request(testEnv.expressServer.app)
      .delete('/event/3/participate/3')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send();
    expect(response.status).toBe(200);

    // DB Check
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM participation WHERE event_id = 3'
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].participant_name).toBe('김영희');
    expect(queryResult[0].phone_number).toBe('010-1234-5678');
    expect(queryResult[0].email).toBe('yhkim@gmail.com');
    expect(queryResult[0].comment).toBe('음 계정은 yhkim 입니다.');
  });

  test('Success - Delete a newly created participation on existing event', async () => {
    // Create new participation on existing event
    let response = await request(testEnv.expressServer.app)
      .post('/event/3/participate')
      .send({
        participantName: '홍길동',
        email: 'gildong@gmail.com',
        comment: 'test',
      });
    expect(response.status).toBe(200);

    // DB Check
    let queryResult = await testEnv.dbClient.query(
      'SELECT * FROM participation WHERE event_id = 3'
    );
    expect(queryResult.length).toBe(3);
    const result = queryResult.filter((qr: {id: number}) => qr.id > 4);
    expect(result[0].participant_name).toBe('홍길동');
    expect(result[0].phone_number).toBeNull();
    expect(result[0].email).toBe('gildong@gmail.com');
    expect(result[0].comment).toBe('test');
    const participationId = result[0].id;

    // Delete participation
    response = await request(testEnv.expressServer.app)
      .delete(`/event/3/participate/${participationId}`)
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send();
    expect(response.status).toBe(200);

    // DB Check
    queryResult = await testEnv.dbClient.query(
      'SELECT * FROM participation WHERE event_id = 3'
    );
    expect(queryResult.length).toBe(2);
  });

  test('Success - Delete a newly created participation on new event', async () => {
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
    let queryResult = await testEnv.dbClient.query(
      `SELECT * FROM participation WHERE event_id = ${eventId}`
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].participant_name).toBe('홍길동');
    expect(queryResult[0].phone_number).toBeNull();
    expect(queryResult[0].email).toBe('gildong@gmail.com');
    expect(queryResult[0].comment).toBe('test');
    const participationId = queryResult[0].id;

    // Remove participation
    response = await request(testEnv.expressServer.app)
      .delete(`/event/${eventId}/participate/${participationId}`)
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send();
    expect(response.status).toBe(200);

    // DB Check
    queryResult = await testEnv.dbClient.query(
      `SELECT * FROM participation WHERE event_id = ${eventId}`
    );
    expect(queryResult.length).toBe(0);
  });

  test('Success - Delete participation with duplicated participation name and email', async () => {
    // Delete event
    const response = await request(testEnv.expressServer.app)
      .delete('/event/3/participate/2')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send();
    expect(response.status).toBe(200);

    // DB Check - event 3's participation 2 should be removed,
    let queryResult = await testEnv.dbClient.query(
      'SELECT * FROM participation WHERE event_id = 3'
    );
    expect(queryResult.length).toBe(1);
    // event 1's participation 1 should exist.
    queryResult = await testEnv.dbClient.query(
      'SELECT * FROM participation WHERE id = 1'
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].event_id).toBe(1);
    expect(queryResult[0].participant_name).toBe('김영희');
    expect(queryResult[0].phone_number).toBeNull();
    expect(queryResult[0].email).toBe('yhkim@gmail.com');
    expect(queryResult[0].comment).toBeNull();
  });

  test('Fail - Not authorized user', async () => {
    // Delete event (Without token)
    const response = await request(testEnv.expressServer.app)
      .delete('/event/1/participate/1')
      .set('Cookie', ['X-ACCESS-TOKEN='])
      .send();
    expect(response.status).toBe(401);
    expect(response.body.error).toBe(
      'Authentication information is missing/invalid'
    );

    // Event 1 - Participation 1 should not be removed
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM participation WHERE id = 1'
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].event_id).toBe(1);
    expect(queryResult[0].participant_name).toBe('김영희');
    expect(queryResult[0].phone_number).toBeNull();
    expect(queryResult[0].email).toBe('yhkim@gmail.com');
    expect(queryResult[0].comment).toBeNull();
  });

  test('Fail - Invalid event id (non-numeric, < 1)', async () => {
    // Delete event (Non-numeric key)
    let response = await request(testEnv.expressServer.app)
      .delete('/event/halloween/participate/1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send();
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');

    // Delete event (key = 0)
    response = await request(testEnv.expressServer.app)
      .delete('/event/0/participate/1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send();
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');

    // Delete event (key = -1)
    response = await request(testEnv.expressServer.app)
      .delete('/event/-1/participate/1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send();
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');

    // DB Check
    // Participation #1 should not be removed
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM participation WHERE id = 1'
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].event_id).toBe(1);
    expect(queryResult[0].participant_name).toBe('김영희');
    expect(queryResult[0].phone_number).toBeNull();
    expect(queryResult[0].email).toBe('yhkim@gmail.com');
    expect(queryResult[0].comment).toBeNull();
  });

  test('Fail - Event ID not found', async () => {
    // Delete event
    const response = await request(testEnv.expressServer.app)
      .delete('/event/100/participate/1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send();
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');

    // DB Check
    // Participation #1 should not be removed
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM participation WHERE id = 1'
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].event_id).toBe(1);
    expect(queryResult[0].participant_name).toBe('김영희');
    expect(queryResult[0].phone_number).toBeNull();
    expect(queryResult[0].email).toBe('yhkim@gmail.com');
    expect(queryResult[0].comment).toBeNull();
  });

  test('Fail - Invalid participation id (non-numeric, < 1)', async () => {
    // Delete event (non-numeric key)
    let response = await request(testEnv.expressServer.app)
      .delete('/event/3/participate/yhkim')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send();
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');

    // Delete event (key = -1)
    response = await request(testEnv.expressServer.app)
      .delete('/event/3/participate/-1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send();
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');

    // Delete event (key = 0)
    response = await request(testEnv.expressServer.app)
      .delete('/event/3/participate/0')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send();
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');

    // DB Check - Event 3's participation ticket should not be removed
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM participation WHERE event_id = 3'
    );
    expect(queryResult.length).toBe(2);
  });

  test('Fail - Participation ID not found', async () => {
    // Delete event
    const response = await request(testEnv.expressServer.app)
      .delete('/event/3/participate/100')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send();
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');

    // DB Check - Event 3's participation ticket should not be removed
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM participation WHERE event_id = 3'
    );
    expect(queryResult.length).toBe(2);
  });

  test('Fail - Participation not associated with the event', async () => {
    // Delete event
    const response = await request(testEnv.expressServer.app)
      .delete('/event/3/participate/1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send();
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');

    // DB Check
    // Either participation #1 and event 3's participation should not be removed
    let queryResult = await testEnv.dbClient.query(
      'SELECT * FROM participation WHERE id = 1'
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].event_id).toBe(1);
    expect(queryResult[0].participant_name).toBe('김영희');
    expect(queryResult[0].phone_number).toBeNull();
    expect(queryResult[0].email).toBe('yhkim@gmail.com');
    expect(queryResult[0].comment).toBeNull();
    queryResult = await testEnv.dbClient.query(
      'SELECT * FROM participation WHERE event_id = 3'
    );
    expect(queryResult.length).toBe(2);
  });
});
