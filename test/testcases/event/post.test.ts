/**
 * Jest unit test for POST /event method
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

// eslint-disable-next-line node/no-unpublished-import
import * as request from 'supertest';
// eslint-disable-next-line node/no-unpublished-import
import MockDate from 'mockdate';
import TestEnv from '../../TestEnv';
import AuthToken from '../../../src/datatypes/authentication/AuthToken';
import * as jwt from 'jsonwebtoken';

describe('POST /event - Create new event', () => {
  let testEnv: TestEnv;

  // Information that used during the test
  const loginCredentials = {
    username: 'testuser1',
    password: 'Password13!',
  };
  const requiredPayload = {year: 2022, month: 1, date: 1, name: '신년 해돋이'};

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

  test('Success', async () => {
    // Login
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Request
    response = await request(testEnv.expressServer.app)
      .post('/event')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({
        ...requiredPayload,
        detail: '신년 맞이 일출을 광안리에서 봅니다.',
        category: '네트워킹',
      });
    expect(response.status).toBe(200);

    // DB Test
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM event WHERE editor = ? AND name = ?',
      ['testuser1', '신년 해돋이']
    );
    expect(queryResult.length).toBe(1);
    expect(new Date(queryResult[0].date).toISOString()).toBe(
      new Date(2022, 0, 1).toISOString()
    );
    expect(queryResult[0].detail).toBe('신년 맞이 일출을 광안리에서 봅니다.');
    expect(queryResult[0].category).toBe('네트워킹');
  });

  test('Success - Without detail and category', async () => {
    // Login
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Request
    response = await request(testEnv.expressServer.app)
      .post('/event')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send(requiredPayload);
    expect(response.status).toBe(200);

    // DB Test
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM event WHERE editor = ? AND name = ?',
      ['testuser1', '신년 해돋이']
    );
    expect(queryResult.length).toBe(1);
    expect(new Date(queryResult[0].date).toISOString()).toBe(
      new Date(2022, 0, 1).toISOString()
    );
  });

  test('Success - Without detail', async () => {
    // Login
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Request
    response = await request(testEnv.expressServer.app)
      .post('/event')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({...requiredPayload, category: '네트워킹'});
    expect(response.status).toBe(200);

    // DB Test
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM event WHERE editor = ? AND name = ?',
      ['testuser1', '신년 해돋이']
    );
    expect(queryResult.length).toBe(1);
    expect(new Date(queryResult[0].date).toISOString()).toBe(
      new Date(2022, 0, 1).toISOString()
    );
    expect(queryResult[0].category).toBe('네트워킹');
  });

  test('Success - Without category', async () => {
    // Login
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Request
    response = await request(testEnv.expressServer.app)
      .post('/event')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({
        ...requiredPayload,
        detail: '신년 맞이 일출을 광안리에서 봅니다.',
      });
    expect(response.status).toBe(200);

    // DB Test
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM event WHERE editor = ? AND date = ?',
      ['testuser1', '2022-01-01']
    );
    expect(queryResult.length).toBe(1);
    expect(new Date(queryResult[0].date).toISOString()).toBe(
      new Date(2022, 0, 1).toISOString()
    );
    expect(queryResult[0].detail).toBe('신년 맞이 일출을 광안리에서 봅니다.');
  });

  test('Success - Duplicated date and name okay', async () => {
    // Login
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Request 1
    response = await request(testEnv.expressServer.app)
      .post('/event')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({
        ...requiredPayload,
        detail: '신년 맞이 일출을 광안리에서 봅니다.',
      });
    expect(response.status).toBe(200);

    // Request 2
    response = await request(testEnv.expressServer.app)
      .post('/event')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({
        ...requiredPayload,
        detail: '신년 맞이 일출을 해운대에서 봅니다.',
      });
    expect(response.status).toBe(200);

    // DB Test
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM event WHERE editor = ? AND name = ?',
      ['testuser1', '신년 해돋이']
    );
    expect(queryResult.length).toBe(2);
    expect(new Date(queryResult[0].date).toISOString()).toBe(
      new Date(2022, 0, 1).toISOString()
    );
    expect(new Date(queryResult[1].date).toISOString()).toBe(
      new Date(2022, 0, 1).toISOString()
    );
    const details = [queryResult[0].detail, queryResult[1].detail];
    expect(details.includes('신년 맞이 일출을 해운대에서 봅니다.')).toBe(true);
    expect(details.includes('신년 맞이 일출을 광안리에서 봅니다.')).toBe(true);
  });

  test('Fail - Bad Request (Missing required field)', async () => {
    // Login
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Request
    response = await request(testEnv.expressServer.app)
      .post('/event')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({
        year: 2022,
        month: 1,
        date: 1,
        detail: '신년 맞이 일출을 광안리에서 봅니다.',
        category: '네트워킹',
      });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    // DB Test
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM event WHERE editor = ? AND date = ?',
      ['testuser1', '2022-01-01']
    );
    expect(queryResult.length).toBe(0);
  });

  test('Fail - Bad Request (Having more field)', async () => {
    // Login
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Request
    response = await request(testEnv.expressServer.app)
      .post('/event')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({
        ...requiredPayload,
        detail: '신년 맞이 일출을 광안리에서 봅니다.',
        category: '네트워킹',
        misc: '식대비: 10000원',
      });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    // DB Test
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM event WHERE editor = ? AND date = ?',
      ['testuser1', '2022-01-01']
    );
    expect(queryResult.length).toBe(0);
  });

  test('Fail - Bad Request (Invalid Date)', async () => {
    // Login
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Request
    response = await request(testEnv.expressServer.app)
      .post('/event')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({year: 2022, month: 2, date: 30, name: 'BGM 워크샵'});
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    // DB Test
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM event WHERE editor = ? AND name = ?',
      ['testuser1', 'BGM 워크샵']
    );
    expect(queryResult.length).toBe(0);
  });

  test('Fail - Not authenticated user (expired token)', async () => {
    const currentDate = new Date();

    // Login
    MockDate.set(currentDate);
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Passed 20 min (accessToken expired, refreshToken alive)
    currentDate.setMinutes(currentDate.getMinutes() + 20);
    MockDate.set(currentDate);

    // Request
    response = await request(testEnv.expressServer.app)
      .post('/event')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send({
        ...requiredPayload,
        detail: '신년 맞이 일출을 광안리에서 봅니다.',
      });
    expect(response.status).toBe(401);
    expect(response.body.error).toBe(
      'Authentication information is missing/invalid'
    );

    // DB Test
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM event WHERE editor = ? AND name = ?',
      ['testuser1', '신년 해돋이']
    );
    expect(queryResult.length).toBe(0);
  });

  test('Fail - Not authenticated user (use refresh token)', async () => {
    // Login
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);
    const refreshToken = response.header['set-cookie'][1]
      .split('; ')[0]
      .split('=')[1];

    // Request
    response = await request(testEnv.expressServer.app)
      .post('/event')
      .set('Cookie', [`X-ACCESS-TOKEN=${refreshToken}`])
      .send(requiredPayload);
    expect(response.status).toBe(401);
    expect(response.body.error).toBe(
      'Authentication information is missing/invalid'
    );

    // DB Test
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM event WHERE editor = ? AND name = ?',
      ['testuser1', '신년 해돋이']
    );
    expect(queryResult.length).toBe(0);
  });

  test('Fail - Not authenticated user (wrong token type)', async () => {
    // Login
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);
    const tokenContents: AuthToken = {
      username: 'testuser1',
      type: 'refresh',
    };
    const jwtOption: jwt.SignOptions = {
      algorithm: 'HS512',
      expiresIn: '15m',
    };
    const accessToken = jwt.sign(
      tokenContents,
      testEnv.testConfig.jwt.secretKey,
      jwtOption
    );

    // Request
    response = await request(testEnv.expressServer.app)
      .post('/event')
      .set('Cookie', [`X-ACCESS-TOKEN=${accessToken}`])
      .send(requiredPayload);
    expect(response.status).toBe(401);
    expect(response.body.error).toBe(
      'Authentication information is missing/invalid'
    );

    // DB Test
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM event WHERE editor = ? AND name = ?',
      ['testuser1', '신년 해돋이']
    );
    expect(queryResult.length).toBe(0);
  });

  test('Fail - Not authenticated user (missing token)', async () => {
    // Login
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);

    // Request - Without token
    response = await request(testEnv.expressServer.app)
      .post('/event')
      .send(requiredPayload);
    expect(response.status).toBe(401);
    expect(response.body.error).toBe(
      'Authentication information is missing/invalid'
    );

    // DB Test
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM event WHERE editor = ? AND name = ?',
      ['testuser1', '신년 해돋이']
    );
    expect(queryResult.length).toBe(0);
  });
});
