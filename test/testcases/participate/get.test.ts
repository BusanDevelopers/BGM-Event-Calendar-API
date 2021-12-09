/**
 * Jest unit test for GET /event/{eventID}/participate method
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

// eslint-disable-next-line node/no-unpublished-import
import * as request from 'supertest';
import TestEnv from '../../TestEnv';

describe('GET /event/{eventID}/participate - Retrieve event participant information', () => {
  let testEnv: TestEnv;

  // Information that used during the test
  const loginCredentials = {username: 'testuser1', password: 'Password13!'};
  let accessToken: string;

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

  test('Success - Multiple participants', async () => {
    // Request
    const response = await request(testEnv.expressServer.app)
      .get('/event/3/participate')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`]);
    expect(response.status).toBe(200);
    expect(response.body.numParticipants).toBe(2);
    expect(response.body.participantsList.length).toBe(2);
    response.body.participantsList.forEach(
      (p: {
        participantName: string;
        phoneNumber: string | undefined;
        email: string;
        comment: string | undefined;
        id: number;
      }) => {
        if (p.participantName === '김영희') {
          expect(p.phoneNumber).toBe('01012345678');
          expect(p.email).toBe('yhkim@gmail.com');
          expect(p.comment).toBe('음 계정은 yhkim 입니다.');
          expect(p.id).toBe(2);
        } else if (p.participantName === '김말숙') {
          expect(p.phoneNumber).toBeUndefined();
          expect(p.email).toBe('mskim@gmail.com');
          expect(p.comment).toBe('음 계정은 mskim 입니다.');
          expect(p.id).toBe(3);
        } else {
          fail();
        }
      }
    );
  });

  test('Success - Single participant', async () => {
    // Request
    const response = await request(testEnv.expressServer.app)
      .get('/event/1/participate')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`]);
    expect(response.status).toBe(200);
    expect(response.body.numParticipants).toBe(1);
    expect(response.body.participantsList.length).toBe(1);
    expect(response.body.participantsList[0].participantName).toBe('김영희');
    expect(response.body.participantsList[0].phoneNumber).toBeUndefined();
    expect(response.body.participantsList[0].email).toBe('yhkim@gmail.com');
    expect(response.body.participantsList[0].comment).toBeUndefined();
    expect(response.body.participantsList[0].id).toBe(1);
  });

  test('Success - No participant', async () => {
    // Request
    const response = await request(testEnv.expressServer.app)
      .get('/event/2/participate')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`]);
    expect(response.status).toBe(200);
    expect(response.body.numParticipants).toBe(0);
    expect(response.body.participantsList).toBeUndefined();
  });

  test('Success - Newly created event without participant', async () => {
    // Create new event
    let response = await request(testEnv.expressServer.app)
      .post('/event')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({year: 2022, month: 1, date: 1, name: '신년 해돋이'});
    expect(response.status).toBe(200);

    // Retrieve Event ID
    response = await request(testEnv.expressServer.app).get('/2022-1');
    expect(response.status).toBe(200);
    const eventId = response.body.eventList[0].id;

    // Get participant list
    response = await request(testEnv.expressServer.app)
      .get(`/event/${eventId}/participate`)
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`]);
    expect(response.status).toBe(200);
    expect(response.body.numParticipants).toBe(0);
    expect(response.body.participantsList).toBeUndefined();
  });

  test('Success - Newly created event with participants', async () => {
    // Create new event
    let response = await request(testEnv.expressServer.app)
      .post('/event')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({year: 2022, month: 1, date: 1, name: '신년 해돋이'});
    expect(response.status).toBe(200);

    // Retrieve Event ID
    response = await request(testEnv.expressServer.app).get('/2022-1');
    expect(response.status).toBe(200);
    const eventId = response.body.eventList[0].id;

    // Add Participation
    response = await request(testEnv.expressServer.app)
      .post(`/event/${eventId}/participate`)
      .send({
        participantName: '홍길동',
        phoneNumber: '01012345678',
        email: 'gildong@gmail.com',
        comment: 'test',
      });
    expect(response.status).toBe(200);

    // Get participant list
    response = await request(testEnv.expressServer.app)
      .get(`/event/${eventId}/participate`)
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`]);
    expect(response.status).toBe(200);
    expect(response.body.numParticipants).toBe(1);
    expect(response.body.participantsList.length).toBe(1);
    expect(response.body.participantsList[0].participantName).toBe('홍길동');
    expect(response.body.participantsList[0].phoneNumber).toBe('01012345678');
    expect(response.body.participantsList[0].email).toBe('gildong@gmail.com');
    expect(response.body.participantsList[0].comment).toBe('test');
  });

  test('Fail - Not authenticated user', async () => {
    // Request
    const response = await request(testEnv.expressServer.app).get(
      '/event/1/participate'
    );
    expect(response.status).toBe(401);
    expect(response.body.error).toBe(
      'Authentication information is missing/invalid'
    );
  });

  test('Fail - eventID not valid', async () => {
    // Request (non-numeric eventID)
    let response = await request(testEnv.expressServer.app)
      .get('/event/halloween/participate')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`]);
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');

    // Request (eventID = 0)
    response = await request(testEnv.expressServer.app)
      .get('/event/0/participate')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`]);
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');

    // Request (eventID = -1)
    response = await request(testEnv.expressServer.app)
      .get('/event/-1/participate')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`]);
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');
  });

  test('Fail - eventID not found', async () => {
    // Request (eventID not exist)
    const response = await request(testEnv.expressServer.app)
      .get('/event/100/participate')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`]);
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');
  });
});
