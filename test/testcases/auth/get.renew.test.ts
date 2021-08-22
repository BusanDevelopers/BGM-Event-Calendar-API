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

  test('Success - Refresh Token about to expire', async () => {
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

    // Passed 110 min (Refresh token about to expire, access token expired)
    currentDate.setMinutes(currentDate.getMinutes() + 110);
    MockDate.set(currentDate);
    // Renew Request
    response = await request(testEnv.expressServer.app)
      .get('/auth/renew')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`]);
    expect(response.status).toBe(200);

    // Check Cookie and Token Values
    const jwtOption: jwt.VerifyOptions = {algorithms: ['HS512']};
    // Parse Refresh Token
    let cookie = response.header['set-cookie'][0].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-REFRESH-TOKEN'); // Check for Refresh Token Name
    let tokenPayload = jwt.verify(
      cookie[1],
      testEnv.testConfig.jwt.refreshKey,
      jwtOption
    ) as AuthToken; // Check for AccessToken contents
    expect(tokenPayload.username).toBe('testuser1');
    expect(tokenPayload.type).toBe('refresh');
    // Parse Access Token
    cookie = response.header['set-cookie'][1].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-ACCESS-TOKEN'); // Check for Access Token Name
    tokenPayload = jwt.verify(
      cookie[1],
      testEnv.testConfig.jwt.secretKey,
      jwtOption
    ) as AuthToken; // Check for AccessToken contents
    expect(tokenPayload.username).toBe('testuser1');
    expect(tokenPayload.type).toBe('access');
  });

  test('Fail - Invalid Token', async () => {
    const currentDate = new Date();

    // Login
    MockDate.set(currentDate);
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Passed 10 min (Both tokens alive)
    currentDate.setMinutes(currentDate.getMinutes() + 10);
    MockDate.set(currentDate);
    // Renew Request
    response = await request(testEnv.expressServer.app)
      .get('/auth/renew')
      .set('Cookie', [`X-REFRESH-TOKEN=${accessToken}`]);
    expect(response.status).toBe(401);

    // Check Cookie and Token Values
    expect(response.header['set-cookie']).toBeUndefined();
  });

  test('Fail - No Token', async () => {
    const currentDate = new Date();

    // Login
    MockDate.set(currentDate);
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);

    // Passed 10 min (Both tokens alive)
    currentDate.setMinutes(currentDate.getMinutes() + 10);
    MockDate.set(currentDate);
    // Renew Request
    response = await request(testEnv.expressServer.app).get('/auth/renew');
    expect(response.status).toBe(401);

    // Check Cookie and Token Values
    expect(response.header['set-cookie']).toBeUndefined();
  });

  test('Fail - Token not in DB (logged out)', async () => {
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

    // Logout
    currentDate.setSeconds(currentDate.getSeconds() + 1);
    MockDate.set(currentDate);
    response = await request(testEnv.expressServer.app)
      .delete('/auth/logout')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`]);
    expect(response.status).toBe(200);

    // Passed 20 min (Refresh token alive, access token expired
    currentDate.setMinutes(currentDate.getMinutes() + 20);
    MockDate.set(currentDate);
    // Renew Request
    response = await request(testEnv.expressServer.app)
      .get('/auth/renew')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`]);
    expect(response.status).toBe(401);

    // Check Cookie & token Information
    expect(response.header['set-cookie']).toBeUndefined();
  });

  test('Fail - Admin user deleted', async () => {
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

    // Remove admin entry
    await testEnv.dbClient.query(
      'DELETE from admin where username = ?',
      'testuser1'
    );

    // Passed 20 min (Refresh token alive, access token expired
    currentDate.setMinutes(currentDate.getMinutes() + 20);
    MockDate.set(currentDate);
    // Renew Request
    response = await request(testEnv.expressServer.app)
      .get('/auth/renew')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`]);
    expect(response.status).toBe(401);

    // Check Cookie & token Information
    expect(response.header['set-cookie']).toBeUndefined();
  });
});
