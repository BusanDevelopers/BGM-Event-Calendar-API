/**
 * Jest unit test for DELETE /event/{eventID} method
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

// eslint-disable-next-line node/no-unpublished-import
import * as request from 'supertest';
import TestEnv from '../../TestEnv';

describe('DELETE /event/{eventID} - Delete an existing event', () => {
  let testEnv: TestEnv;

  // Information that used during the test
  const loginCredentials = {
    username: 'testuser1',
    password: 'Password13!',
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

  test('Success - Delete event that I newly registered', async () => {
    // Login
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Register a event
    response = await request(testEnv.expressServer.app)
      .post('/event')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({year: 2022, month: 1, date: 1, name: '신년 해돋이'});
    expect(response.status).toBe(200);

    // Delete the event
    response = await request(testEnv.expressServer.app)
      .delete('/event/5')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`]);
    expect(response.status).toBe(200);

    // DB Check
    const queryResult = await testEnv.dbClient.query('SELECT * FROM event');
    expect(queryResult.length).toBe(4);
    const checkTarget = queryResult.filter((r: {id: number}) => r.id === 1);
    expect(checkTarget.date.toISOString()).toBe(
      new Date(2021, 9, 31).toISOString()
    );
    expect(checkTarget.name).toBe('할로윈 파티');
    expect(checkTarget.detail).toBe(undefined);
    expect(checkTarget.category).toBe('네트워킹');
    expect(checkTarget.editor).toBe('testuser1');
  });

  test('Success - Delete event that I previously registered', async () => {
    // Login
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Delete the event
    response = await request(testEnv.expressServer.app)
      .delete('/event/1')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`]);
    expect(response.status).toBe(200);

    // DB Check
    const queryResult = await testEnv.dbClient.query('SELECT * FROM event');
    expect(queryResult.length).toBe(3);
    const checkTarget = queryResult.filter((r: {id: number}) => r.id === 2);
    expect(checkTarget.date.toISOString()).toBe(
      new Date(2021, 7, 15).toISOString()
    );
    expect(checkTarget.name).toBe('광복절');
    expect(checkTarget.detail).toBe(undefined);
    expect(checkTarget.category).toBe(undefined);
    expect(checkTarget.editor).toBe('testuser2');
  });

  test('Success - Delete event that other person registered', async () => {
    // Login
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Delete the event
    response = await request(testEnv.expressServer.app)
      .delete('/event/3')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`]);
    expect(response.status).toBe(200);

    // DB Check
    const queryResult = await testEnv.dbClient.query('SELECT * FROM event');
    expect(queryResult.length).toBe(3);
    const checkTarget = queryResult.filter((r: {id: number}) => r.id === 2);
    expect(checkTarget.date.toISOString()).toBe(
      new Date(2021, 7, 15).toISOString()
    );
    expect(checkTarget.name).toBe('광복절');
    expect(checkTarget.detail).toBe(undefined);
    expect(checkTarget.category).toBe(undefined);
    expect(checkTarget.editor).toBe('testuser2');
  });

  test('Success - Delete event with duplicated name', async () => {});

  test('Fail - Not authorized user', async () => {});

  test('Fail - Invalid Event ID', async () => {});

  test('Fail - Event ID Not Found', async () => {});
});
