/**
 * Jest tests to check whether data deleted/updated as intended when related
 *   entry removed/changed.
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

// eslint-disable-next-line node/no-unpublished-import
import * as request from 'supertest';
import * as Cosmos from '@azure/cosmos';
import TestEnv from '../TestEnv';
import ExpressServer from '../../src/ExpressServer';
import deleteAdmin from '../../src/functions/utils/deleteAdmin';

describe('Integrated DB Test', () => {
  let testEnv: TestEnv;

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
  });

  afterEach(async () => {
    await testEnv.stop();
  });

  test('Event remains when Admin removed', async () => {
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Remove Admin account
    const result = await deleteAdmin('testuser1', testEnv.testConfig);
    expect(result.statusCode).toBe(204);

    // DB Check (Event remains when Admin removed)
    let queryResult = await testEnv.dbClient
      .container(EVENT)
      .items.query('SELECT * FROM event')
      .fetchAll();
    expect(queryResult.resources.length).toBe(4);
    queryResult = await testEnv.dbClient
      .container(EVENT)
      .items.query("SELECT * FROM event AS e WHERE e.editor = 'testuser1'")
      .fetchAll();
    expect(queryResult.resources.length).toBe(2);
    queryResult.resources.forEach(
      (qr: {
        name: string;
        date: string;
        detail: string | undefined;
        category: string | undefined;
      }) => {
        if (qr.name === '할로윈 파티') {
          expect(new Date(qr.date).toISOString()).toBe(
            new Date(2021, 9, 31).toISOString()
          );
          expect(qr.detail).toBeUndefined();
          expect(qr.category).toBe('네트워킹');
        } else if (qr.name === '연말 결산 모임') {
          expect(new Date(qr.date).toISOString()).toBe(
            new Date(2021, 11, 31).toISOString()
          );
          expect(qr.detail).toBe(
            '연말을 맞아 BGM 회원끼리 모여 서로의 일년은 어땠는지, 내년 목표는 무엇인지에 관해 이야기해보려 합니다.'
          );
          expect(qr.category).toBeUndefined();
        } else {
          throw new Error();
        }
      }
    );
  });

  test('Participation removed when Event removed', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Login Request (Get access token)
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Retrieve event ID
    const dbOps = await testEnv.dbClient
      .container(EVENT)
      .items.query('SELECT e.id FROM event AS e WHERE e.name = "할로윈 파티"')
      .fetchAll();
    const eventId = dbOps.resources[0].id;

    // Remove event
    response = await request(testEnv.expressServer.app)
      .delete(`/event/${eventId}`)
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`]);
    expect(response.status).toBe(200);

    // DB Check (Participation removed when Event removed)
    const queryResult = await testEnv.dbClient
      .container(PARTICIPATION)
      .items.query(
        `SELECT * FROM participation AS p WHERE p.eventId = "${eventId}"`
      )
      .fetchAll();
    expect(queryResult.resources.length).toBe(0);
  });
});
