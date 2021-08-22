/**
 * Jest unit test for GET /auth/renew method
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

// eslint-disable-next-line node/no-unpublished-import
import * as request from 'supertest';
import * as jwt from 'jsonwebtoken';
// eslint-disable-next-line node/no-unpublished-import
import MockDate from 'mockdate';
import TestEnv from '../../TestEnv';
import AuthToken from '../../../src/datatypes/authentication/AuthToken';

describe('GET /auth/renew - renew access/refresh token', () => {
  let testEnv: TestEnv;

  beforeAll(() => {
    jest.setTimeout(120000);
  });

  beforeEach(async () => {
    // Setup TestEnv
    testEnv = new TestEnv(expect.getState().currentTestName);
    await testEnv.start();
  });

  afterEach(async () => {
    await testEnv.stop();
  });

  test('Success', async () => {
    const currentDate = new Date();

    // Login
    MockDate.set(currentDate);
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);
    const refreshToken = response.header['set-cookie'][1]
      .split('; ')[0]
      .split('=')[1];

    // Both token alive - need to process renewal request
    // Renew Request
    response = await request(testEnv.expressServer.app)
      .get('/auth/renew')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`]);
    expect(response.status).toBe(200);

    // Check Cookie and Token Values
    const jwtOption: jwt.VerifyOptions = {algorithms: ['HS512']};
    // Parse Access Token
    let cookie = response.header['set-cookie'][0].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-ACCESS-TOKEN'); // Check for Access Token Name
    let tokenPayload = jwt.verify(
      cookie[1],
      testEnv.testConfig.jwt.secretKey,
      jwtOption
    ) as AuthToken; // Check for AccessToken contents
    expect(tokenPayload.username).toBe('testuser1');
    expect(tokenPayload.type).toBe('access');

    // Passed 20 min (Refresh token alive, access token expired
    currentDate.setMinutes(currentDate.getMinutes() + 20);
    MockDate.set(currentDate);
    // Renew Request
    response = await request(testEnv.expressServer.app)
      .get('/auth/renew')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`]);
    expect(response.status).toBe(200);

    // Check Cookie and Token Values
    // Parse Access Token
    cookie = response.header['set-cookie'][0].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-ACCESS-TOKEN'); // Check for Access Token Name
    tokenPayload = jwt.verify(
      cookie[1],
      testEnv.testConfig.jwt.secretKey,
      jwtOption
    ) as AuthToken; // Check for AccessToken contents
    expect(tokenPayload.username).toBe('testuser1');
    expect(tokenPayload.type).toBe('access');
  });

  test('Success - Refresh Token about to expire', async () => {});

  test('Fail - Invalid Token', async () => {});

  test('Fail - No Token', async () => {});

  test('Fail - Token not in DB (logged out)', async () => {});

  test('Fail - Admin user deleted', async () => {});
});
