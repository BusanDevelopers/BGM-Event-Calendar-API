/**
 * Jest tests to check whether data deleted/updated as intended when related
 *   entry removed/changed.
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

// eslint-disable-next-line node/no-unpublished-import
import * as request from 'supertest';
import TestEnv from '../TestEnv';
import deleteAdmin from '../../src/functions/utils/deleteAdmin';

describe('Integrated DB Test', () => {
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

  test('Admin Session removed when Admin removed', async () => {
    // Login Request (Create Admin Session)
    const response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);

    // Remove Admin account
    const result = await deleteAdmin('testuser1', testEnv.testConfig);
    expect(result.affectedRows).toBe(1);

    // DB Check (Admin session also removed)
    const queryResult = await testEnv.dbClient.query(
      "SELECT * FROM admin_session WHERE username = 'testuser1'"
    );
    expect(queryResult.length).toBe(0);
  });

  test('Event remains when Admin removed', async () => {
    // Remove Admin account
    const result = await deleteAdmin('testuser1', testEnv.testConfig);
    expect(result.affectedRows).toBe(1);

    // DB Check (Event remains when Admin removed)
    let queryResult = await testEnv.dbClient.query('SELECT * FROM event');
    expect(queryResult.length).toBe(4);
    queryResult = await testEnv.dbClient.query(
      "SELECT * FROM event WHERE editor = 'testuser1'"
    );
    expect(queryResult.length).toBe(0);
    queryResult = await testEnv.dbClient.query(
      "SELECT * FROM event WHERE editor = 'testuser1_r'"
    );
    expect(queryResult.length).toBe(2);
    queryResult.forEach(
      (qr: {
        name: string;
        date: string;
        detail: string | null;
        category: string | null;
      }) => {
        if (qr.name === '할로윈 파티') {
          expect(new Date(qr.date).toISOString()).toBe(
            new Date(2021, 9, 31).toISOString()
          );
          expect(qr.detail).toBeNull();
          expect(qr.category).toBe('네트워킹');
        } else if (qr.name === '연말 결산 모임') {
          expect(new Date(qr.date).toISOString()).toBe(
            new Date(2021, 11, 31).toISOString()
          );
          expect(qr.detail).toBe(
            '연말을 맞아 BGM 회원끼리 모여 서로의 일년은 어땠는지, 내년 목표는 무엇인지에 관해 이야기해보려 합니다.'
          );
          expect(qr.category).toBeNull();
        } else {
          fail();
        }
      }
    );
  });

  test('Participation removed when Event removed', async () => {
    // Login Request (Get access token)
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Remove event
    response = await request(testEnv.expressServer.app)
      .delete('/event/1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`]);
    expect(response.status).toBe(200);

    // DB Check (Participation removed when Event removed)
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM participation WHERE event_id = 1'
    );
    expect(queryResult.length).toBe(0);
  });
});
