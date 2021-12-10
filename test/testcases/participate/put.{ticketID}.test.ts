/**
 * Jest unit test for PUT /event/{eventID}/participate/{ticketID} method
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

// eslint-disable-next-line node/no-unpublished-import
import * as request from 'supertest';
import TestEnv from '../../TestEnv';

describe('PUT /event/{eventID}/participate/{ticketID} - Edit an existing participation ticket', () => {
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
    // Update an participation
    const response = await request(testEnv.expressServer.app)
      .put('/event/1/participate/1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({participantName: '김철수'});
    expect(response.status).toBe(200);

    // DB Check
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM participation WHERE id = 1 AND event_id = 1'
    );
    expect(queryResult.length).toBe(1);
    expect(new Date(queryResult[0].date).toISOString()).toBe(
      new Date('2021-08-17').toISOString()
    );
    expect(queryResult[0].participant_name).toBe('김철수');
    expect(queryResult[0].phone_number).toBeNull();
    expect(queryResult[0].email).toBe('yhkim@gmail.com');
    expect(queryResult[0].comment).toBeNull();
  });

  test('Success - Edit phone number', async () => {
    // Update an participation
    const response = await request(testEnv.expressServer.app)
      .put('/event/1/participate/1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({phoneNumber: '01012345678'});
    expect(response.status).toBe(200);

    // DB Check
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM participation WHERE id = 1 AND event_id = 1'
    );
    expect(queryResult.length).toBe(1);
    expect(new Date(queryResult[0].date).toISOString()).toBe(
      new Date('2021-08-17').toISOString()
    );
    expect(queryResult[0].participant_name).toBe('김영희');
    expect(queryResult[0].phone_number).toBe('01012345678');
    expect(queryResult[0].email).toBe('yhkim@gmail.com');
    expect(queryResult[0].comment).toBeNull();
  });

  test('Success - Edit email', async () => {
    // Update an participation
    const response = await request(testEnv.expressServer.app)
      .put('/event/1/participate/1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({email: 'yhkim02@gmail.com'});
    expect(response.status).toBe(200);

    // DB Check
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM participation WHERE id = 1 AND event_id = 1'
    );
    expect(queryResult.length).toBe(1);
    expect(new Date(queryResult[0].date).toISOString()).toBe(
      new Date('2021-08-17').toISOString()
    );
    expect(queryResult[0].participant_name).toBe('김영희');
    expect(queryResult[0].phone_number).toBeNull();
    expect(queryResult[0].email).toBe('yhkim02@gmail.com');
    expect(queryResult[0].comment).toBeNull();
  });

  test('Success - Edit comment', async () => {
    // Update an participation
    const response = await request(testEnv.expressServer.app)
      .put('/event/1/participate/1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({comment: '1명 추가 신청합니다.'});
    expect(response.status).toBe(200);

    // DB Check
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM participation WHERE id = 1 AND event_id = 1'
    );
    expect(queryResult.length).toBe(1);
    expect(new Date(queryResult[0].date).toISOString()).toBe(
      new Date('2021-08-17').toISOString()
    );
    expect(queryResult[0].participant_name).toBe('김영희');
    expect(queryResult[0].phone_number).toBeNull();
    expect(queryResult[0].email).toBe('yhkim@gmail.com');
    expect(queryResult[0].comment).toBe('1명 추가 신청합니다.');
  });

  test('Success - Edit numerous properties', async () => {
    // Update an participation
    const response = await request(testEnv.expressServer.app)
      .put('/event/1/participate/1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({
        comment: '1명 추가 신청합니다.',
        email: 'yhkim02@gmail.com',
        phoneNumber: '01012345678',
      });
    expect(response.status).toBe(200);

    // DB Check
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM participation WHERE id = 1 AND event_id = 1'
    );
    expect(queryResult.length).toBe(1);
    expect(new Date(queryResult[0].date).toISOString()).toBe(
      new Date('2021-08-17').toISOString()
    );
    expect(queryResult[0].participant_name).toBe('김영희');
    expect(queryResult[0].phone_number).toBe('01012345678');
    expect(queryResult[0].email).toBe('yhkim02@gmail.com');
    expect(queryResult[0].comment).toBe('1명 추가 신청합니다.');
  });

  test('Fail - Invalid phone number format', async () => {
    // Update an participation
    const response = await request(testEnv.expressServer.app)
      .put('/event/1/participate/1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({phoneNumber: '010-1234-5678'});
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    // DB Check
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM participation WHERE id = 1 AND event_id = 1'
    );
    expect(queryResult.length).toBe(1);
    expect(new Date(queryResult[0].date).toISOString()).toBe(
      new Date('2021-08-17').toISOString()
    );
    expect(queryResult[0].participant_name).toBe('김영희');
    expect(queryResult[0].phone_number).toBeNull();
    expect(queryResult[0].email).toBe('yhkim@gmail.com');
    expect(queryResult[0].comment).toBeNull();
  });

  test('Fail - Invalid email format', async () => {
    // Update an participation
    const response = await request(testEnv.expressServer.app)
      .put('/event/1/participate/1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({email: 'yhkim02@gmail'});
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    // DB Check
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM participation WHERE id = 1 AND event_id = 1'
    );
    expect(queryResult.length).toBe(1);
    expect(new Date(queryResult[0].date).toISOString()).toBe(
      new Date('2021-08-17').toISOString()
    );
    expect(queryResult[0].participant_name).toBe('김영희');
    expect(queryResult[0].phone_number).toBeNull();
    expect(queryResult[0].email).toBe('yhkim@gmail.com');
    expect(queryResult[0].comment).toBeNull();
  });

  test('Fail - Additional field', async () => {
    // Update an participation
    const response = await request(testEnv.expressServer.app)
      .put('/event/1/participate/1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({email: 'yhkim02@gmail.com', nickname: '영희'});
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    // DB Check
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM participation WHERE id = 1 AND event_id = 1'
    );
    expect(queryResult.length).toBe(1);
    expect(new Date(queryResult[0].date).toISOString()).toBe(
      new Date('2021-08-17').toISOString()
    );
    expect(queryResult[0].participant_name).toBe('김영희');
    expect(queryResult[0].phone_number).toBeNull();
    expect(queryResult[0].email).toBe('yhkim@gmail.com');
    expect(queryResult[0].comment).toBeNull();
  });

  test('Fail - Unauthorized', async () => {
    // Update an participation
    const response = await request(testEnv.expressServer.app)
      .put('/event/1/participate/1')
      .send({phoneNumber: '01012345678'});
    expect(response.status).toBe(401);
    expect(response.body.error).toBe(
      'Authentication information is missing/invalid'
    );

    // DB Check
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM participation WHERE id = 1 AND event_id = 1'
    );
    expect(queryResult.length).toBe(1);
    expect(new Date(queryResult[0].date).toISOString()).toBe(
      new Date('2021-08-17').toISOString()
    );
    expect(queryResult[0].participant_name).toBe('김영희');
    expect(queryResult[0].phone_number).toBeNull();
    expect(queryResult[0].email).toBe('yhkim@gmail.com');
    expect(queryResult[0].comment).toBeNull();
  });

  test('Fail - Invalid eventID (non-numeric / < 1)', async () => {
    // Non-numeric eventID
    let response = await request(testEnv.expressServer.app)
      .put('/event/halloween/participate/1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({participantName: '김철수'});
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');

    // eventID = 0
    response = await request(testEnv.expressServer.app)
      .put('/event/0/participate/1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({participantName: '김철수'});
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');

    // eventID = -1
    response = await request(testEnv.expressServer.app)
      .put('/event/-1/participate/1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({participantName: '김철수'});
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');
  });

  test('Fail - eventID Not found', async () => {
    // Event Not Exist
    const response = await request(testEnv.expressServer.app)
      .put('/event/100/participate/1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({participantName: '김철수'});
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');
  });

  test('Fail - Invalid ticketID (non-numeric / < 1)', async () => {
    // Non-numeric ticketID
    let response = await request(testEnv.expressServer.app)
      .put('/event/1/participate/yh')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({participantName: '김철수'});
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');

    // ticketID = 0
    response = await request(testEnv.expressServer.app)
      .put('/event/1/participate/0')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({participantName: '김철수'});
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');

    // ticketID = -1
    response = await request(testEnv.expressServer.app)
      .put('/event/1/participate/-1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({participantName: '김철수'});
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');
  });

  test('Fail - ticketID Not found', async () => {
    // Event Not Exist
    const response = await request(testEnv.expressServer.app)
      .put('/event/1/participate/100')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({participantName: '김철수'});
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');
  });
});
