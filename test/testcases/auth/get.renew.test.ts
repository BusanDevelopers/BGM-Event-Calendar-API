/**
 * Jest unit test for GET /auth/renew method
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

// eslint-disable-next-line node/no-unpublished-import
import * as request from 'supertest';
import * as jwt from 'jsonwebtoken';
import * as Cosmos from '@azure/cosmos';
import TestEnv from '../../TestEnv';
import ExpressServer from '../../../src/ExpressServer';
import AuthToken from '../../../src/datatypes/authentication/AuthToken';
import invalidateToken from '../../utils/invalidateToken';

describe('GET /auth/renew - renew access/refresh token', () => {
  let testEnv: TestEnv;

  // DB Container ID
  const ADMIN = 'admin';

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
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Login
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({id: 'testuser1', password: 'Password13!'});
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
    expect(tokenPayload.id).toBe('testuser1');
    expect(tokenPayload.type).toBe('access');

    // Passed 20 min (Refresh token alive, access token expired
    const affectedSessions = await invalidateToken(testEnv.dbClient, 20);
    expect(affectedSessions).toBe(1);
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
    expect(tokenPayload.id).toBe('testuser1');
    expect(tokenPayload.type).toBe('access');
  });

  test('Success - Refresh Token about to expire', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Login
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({id: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);
    const refreshToken = response.header['set-cookie'][1]
      .split('; ')[0]
      .split('=')[1];

    // Passed 110 min (Refresh token about to expire, access token expired)
    const affectedSessions = await invalidateToken(testEnv.dbClient, 110);
    expect(affectedSessions).toBe(1);
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
    expect(tokenPayload.id).toBe('testuser1');
    expect(tokenPayload.type).toBe('refresh');
    // Parse Access Token
    cookie = response.header['set-cookie'][1].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-ACCESS-TOKEN'); // Check for Access Token Name
    tokenPayload = jwt.verify(
      cookie[1],
      testEnv.testConfig.jwt.secretKey,
      jwtOption
    ) as AuthToken; // Check for AccessToken contents
    expect(tokenPayload.id).toBe('testuser1');
    expect(tokenPayload.type).toBe('access');
  });

  test('Fail - Invalid Token', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Login
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({id: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);
    const accessToken = response.header['set-cookie'][0]
      .split('; ')[0]
      .split('=')[1];

    // Passed 10 min (Both tokens alive)
    const affectedSessions = await invalidateToken(testEnv.dbClient, 10);
    expect(affectedSessions).toBe(1);
    // Renew Request
    response = await request(testEnv.expressServer.app)
      .get('/auth/renew')
      .set('Cookie', [`X-REFRESH-TOKEN=${accessToken}`]);
    expect(response.status).toBe(401);

    // Check Cookie and Token Values
    expect(response.header['set-cookie']).toBeUndefined();
  });

  test('Fail - No Token', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Login
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({id: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);

    // Passed 10 min (Both tokens alive)
    const affectedSessions = await invalidateToken(testEnv.dbClient, 10);
    expect(affectedSessions).toBe(1);
    // Renew Request
    response = await request(testEnv.expressServer.app).get('/auth/renew');
    expect(response.status).toBe(401);

    // Check Cookie and Token Values
    expect(response.header['set-cookie']).toBeUndefined();
  });

  test('Fail - Token not in DB (logged out)', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Login
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({id: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);
    const refreshToken = response.header['set-cookie'][1]
      .split('; ')[0]
      .split('=')[1];

    // Logout
    response = await request(testEnv.expressServer.app)
      .delete('/auth/logout')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`]);
    expect(response.status).toBe(200);

    // Passed 20 min (Refresh token alive, access token expired
    const affectedSessions = await invalidateToken(testEnv.dbClient, 20);
    expect(affectedSessions).toBe(0);
    // Renew Request
    response = await request(testEnv.expressServer.app)
      .get('/auth/renew')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`]);
    expect(response.status).toBe(401);

    // Check Cookie & token Information
    expect(response.header['set-cookie']).toBeUndefined();
  });

  test('Fail - Admin user deleted', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Login
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({id: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);
    const refreshToken = response.header['set-cookie'][1]
      .split('; ')[0]
      .split('=')[1];

    // Remove admin entry
    await testEnv.dbClient.container(ADMIN).item('testuser1').delete();

    // Passed 20 min (Refresh token alive, access token expired
    const affectedSessions = await invalidateToken(testEnv.dbClient, 10);
    expect(affectedSessions).toBe(0);
    // Renew Request
    response = await request(testEnv.expressServer.app)
      .get('/auth/renew')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`]);
    expect(response.status).toBe(401);

    // Check Cookie & token Information
    expect(response.header['set-cookie']).toBeUndefined();
  });
});
