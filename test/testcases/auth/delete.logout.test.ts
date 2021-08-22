/**
 * Jest unit test for DELETE /auth/logout method
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

describe('DELETE /auth/logout - logout from current session', () => {
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

  test('Success Logout', async () => {
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
    // Dummy Login (Other user)
    currentDate.setSeconds(currentDate.getSeconds() + 1);
    MockDate.set(currentDate);
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser2', password: 'Password12!'});
    expect(response.status).toBe(200);

    // Logout request
    currentDate.setSeconds(currentDate.getSeconds() + 1);
    MockDate.set(currentDate);
    response = await request(testEnv.expressServer.app)
      .delete('/auth/logout')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`]);
    expect(response.status).toBe(200);

    // Cookie Clear Check
    let cookie = response.header['set-cookie'][0].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-ACCESS-TOKEN'); // Check for Access Token Name
    expect(cookie[1]).toBe('');
    cookie = response.header['set-cookie'][1].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-REFRESH-TOKEN'); // check for Refresh Token Name
    expect(cookie[1]).toBe('');

    // DB Check
    let queryResult = await testEnv.dbClient.query(
      'SELECT * FROM admin_session WHERE username = ?',
      'testuser1'
    );
    expect(queryResult.length).toBe(0);
    queryResult = await testEnv.dbClient.query(
      'SELECT * FROM admin_session WHERE username = ?',
      'testuser2'
    );
    expect(queryResult.length).toBe(1);
    expect(new Date(queryResult[0].expires) > new Date()).toBe(true);
    const expireDate = new Date();
    expireDate.setMinutes(expireDate.getMinutes() + 121);
    expect(new Date(queryResult[0].expires) < expireDate).toBe(true);
  });

  test('Success logout - about to expire refreshToken', async () => {
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

    // Logout request
    currentDate.setMinutes(currentDate.getMinutes() + 101); // about to expire
    MockDate.set(currentDate);
    response = await request(testEnv.expressServer.app)
      .delete('/auth/logout')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`]);
    expect(response.status).toBe(200);

    // Cookie Clear Check
    let cookie = response.header['set-cookie'][0].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-ACCESS-TOKEN'); // Check for Access Token Name
    expect(cookie[1]).toBe('');
    cookie = response.header['set-cookie'][1].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-REFRESH-TOKEN'); // check for Refresh Token Name
    expect(cookie[1]).toBe('');

    // DB Check
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM admin_session WHERE username = ?',
      'testuser1'
    );
    expect(queryResult.length).toBe(0);
  });

  test('Fail - Use accessToken to logout', async () => {
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

    // Logout request
    currentDate.setMinutes(currentDate.getMinutes() + 1);
    MockDate.set(currentDate);
    response = await request(testEnv.expressServer.app)
      .delete('/auth/logout')
      .set('Cookie', [`X-REFRESH-TOKEN=${accessToken}`]);
    expect(response.status).toBe(401);

    // Cookie Clear Check (Should not be cleared)
    expect(response.header['set-cookie']).toBeUndefined();

    // DB Check
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM admin_session WHERE username = ?',
      'testuser1'
    );
    expect(queryResult.length).toBe(1);
    expect(new Date(queryResult[0].expires) > new Date()).toBe(true);
    const expireDate = new Date();
    expireDate.setMinutes(expireDate.getMinutes() + 121);
    expect(new Date(queryResult[0].expires) < expireDate).toBe(true);
  });

  test('Fail - Use unregistered refreshToken', async () => {
    const currentDate = new Date();
    // Create RefreshToken
    MockDate.set(currentDate);
    const tokenContents: AuthToken = {
      username: 'testuser1',
      type: 'refresh',
    };
    const jwtOption: jwt.SignOptions = {
      algorithm: 'HS512',
      expiresIn: '120m',
    };
    const refreshToken = jwt.sign(
      tokenContents,
      testEnv.testConfig.jwt.refreshKey,
      jwtOption
    );

    // Login request
    currentDate.setSeconds(currentDate.getSeconds() + 1);
    MockDate.set(currentDate);
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);

    // Logout request
    currentDate.setMinutes(currentDate.getMinutes() + 1);
    MockDate.set(currentDate);
    response = await request(testEnv.expressServer.app)
      .delete('/auth/logout')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`]);
    expect(response.status).toBe(401);

    // Cookie Clear Check (Should not be cleared)
    expect(response.header['set-cookie']).toBeUndefined();

    // DB Check
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM admin_session WHERE username = ?',
      'testuser1'
    );
    expect(queryResult.length).toBe(1);
    expect(new Date(queryResult[0].expires) > new Date()).toBe(true);
    const expireDate = new Date();
    expireDate.setMinutes(expireDate.getMinutes() + 121);
    expect(new Date(queryResult[0].expires) < expireDate).toBe(true);
  });

  test('Fail - Use expired refreshToken', async () => {
    const currentDate = new Date();
    // Login request
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);
    const refreshToken = response.header['set-cookie'][1]
      .split('; ')[0]
      .split('=')[1];

    // Logout request
    currentDate.setMinutes(currentDate.getMinutes() + 121); // expired
    MockDate.set(currentDate);
    response = await request(testEnv.expressServer.app)
      .delete('/auth/logout')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`]);
    expect(response.status).toBe(401);

    // Cookie Clear Check (Should not be cleared)
    expect(response.header['set-cookie']).toBeUndefined();

    // Check DB Server - Meaningless here
  });

  test('Fail - Use refreshToken generated with wrong secret key', async () => {
    const currentDate = new Date();
    // Create RefreshToken
    MockDate.set(currentDate);
    const tokenContents: AuthToken = {
      username: 'testuser1',
      type: 'refresh',
    };
    const jwtOption: jwt.SignOptions = {
      algorithm: 'HS512',
      expiresIn: '120m',
    };
    const refreshToken = jwt.sign(tokenContents, 'dummyKey', jwtOption);

    // Login request
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);

    // Logout request
    currentDate.setMinutes(currentDate.getMinutes() + 1);
    MockDate.set(currentDate);
    response = await request(testEnv.expressServer.app)
      .delete('/auth/logout')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`]);
    expect(response.status).toBe(401);

    // Cookie Clear Check (Should not be cleared)
    expect(response.header['set-cookie']).toBeUndefined();

    // DB Check
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM admin_session WHERE username = ?',
      'testuser1'
    );
    expect(queryResult.length).toBe(1);
    expect(new Date(queryResult[0].expires) > new Date()).toBe(true);
    const expireDate = new Date();
    expireDate.setMinutes(expireDate.getMinutes() + 121);
    expect(new Date(queryResult[0].expires) < expireDate).toBe(true);
  });

  test('Fail - Use refreshToken generated with wrong type value', async () => {
    const currentDate = new Date();
    // Create RefreshToken
    MockDate.set(currentDate);
    const tokenContents: AuthToken = {
      username: 'testuser1',
      type: 'access',
    };
    const jwtOption: jwt.SignOptions = {
      algorithm: 'HS512',
      expiresIn: '15m',
    };
    const accessToken = jwt.sign(
      tokenContents,
      testEnv.testConfig.jwt.refreshKey,
      jwtOption
    );

    // Login request
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);

    // Logout request
    currentDate.setMinutes(currentDate.getMinutes() + 1);
    MockDate.set(currentDate);
    response = await request(testEnv.expressServer.app)
      .delete('/auth/logout')
      .set('Cookie', [`X-REFRESH-TOKEN=${accessToken}`]);
    expect(response.status).toBe(401);

    // Cookie Clear Check (Should not be cleared)
    expect(response.header['set-cookie']).toBeUndefined();

    // DB Check
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM admin_session WHERE username = ?',
      'testuser1'
    );
    expect(queryResult.length).toBe(1);
    expect(new Date(queryResult[0].expires) > new Date()).toBe(true);
    const expireDate = new Date();
    expireDate.setMinutes(expireDate.getMinutes() + 121);
    expect(new Date(queryResult[0].expires) < expireDate).toBe(true);
  });

  test('Fail - No Token', async () => {
    const currentDate = new Date();
    // Login request
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);

    // Logout request
    currentDate.setMinutes(currentDate.getMinutes() + 1);
    MockDate.set(currentDate);
    response = await request(testEnv.expressServer.app).delete('/auth/logout');
    expect(response.status).toBe(401);

    // Cookie Clear Check (Should not be cleared)
    expect(response.header['set-cookie']).toBeUndefined();

    // DB Check
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM admin_session WHERE username = ?',
      'testuser1'
    );
    expect(queryResult.length).toBe(1);
    expect(new Date(queryResult[0].expires) > new Date()).toBe(true);
    const expireDate = new Date();
    expireDate.setMinutes(expireDate.getMinutes() + 121);
    expect(new Date(queryResult[0].expires) < expireDate).toBe(true);
  });
});
