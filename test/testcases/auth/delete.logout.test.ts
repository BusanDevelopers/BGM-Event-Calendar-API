/**
 * Jest unit test for DELETE /auth/logout method
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

// eslint-disable-next-line node/no-unpublished-import
import * as request from 'supertest';
import * as jwt from 'jsonwebtoken';
import * as Cosmos from '@azure/cosmos';
// eslint-disable-next-line node/no-unpublished-import
import MockDate from 'mockdate';
import TestEnv from '../../TestEnv';
import ExpressServer from '../../../src/ExpressServer';
import AuthToken from '../../../src/datatypes/authentication/AuthToken';
import invalidateToken from '../../utils/invalidateToken';

describe('DELETE /auth/logout - logout from current session', () => {
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
    MockDate.reset();
    await testEnv.stop();
  });

  test('Success Logout', async () => {
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
    // Dummy Login (Other user)
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({id: 'testuser2', password: 'Password12!'});
    expect(response.status).toBe(200);

    // Logout request
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
    let dbOps = await testEnv.dbClient
      .container(ADMIN)
      .items.query('SELECT * FROM admin AS a WHERE a.id = "testuser1"')
      .fetchAll();
    expect(dbOps.resources.length).toBe(1);
    expect(dbOps.resources[0].session).toBeUndefined();
    dbOps = await testEnv.dbClient
      .container(ADMIN)
      .items.query('SELECT * FROM admin AS a WHERE a.id = "testuser2"')
      .fetchAll();
    expect(dbOps.resources.length).toBe(1);
    expect(new Date(dbOps.resources[0].session.expiresAt) > new Date()).toBe(
      true
    );
    const expireDate = new Date();
    expireDate.setMinutes(expireDate.getMinutes() + 121);
    expect(new Date(dbOps.resources[0].session.expiresAt) < expireDate).toBe(
      true
    );
  });

  test('Success logout - about to expire refreshToken', async () => {
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

    // Logout request
    const affectedSessions = await invalidateToken(testEnv.dbClient, 101);
    expect(affectedSessions).toBe(1);
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
    const dbOps = await testEnv.dbClient
      .container(ADMIN)
      .items.query('SELECT * FROM admin AS a WHERE a.id = "testuser1"')
      .fetchAll();
    expect(dbOps.resources.length).toBe(1);
    expect(dbOps.resources[0].session).toBeUndefined();
  });

  test('Fail - Use accessToken to logout', async () => {
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

    // Logout request
    response = await request(testEnv.expressServer.app)
      .delete('/auth/logout')
      .set('Cookie', [`X-REFRESH-TOKEN=${accessToken}`]);
    expect(response.status).toBe(401);

    // Cookie Clear Check (Should not be cleared)
    expect(response.header['set-cookie']).toBeUndefined();

    // DB Check
    const dbOps = await testEnv.dbClient
      .container(ADMIN)
      .items.query('SELECT * FROM admin AS a WHERE a.id = "testuser1"')
      .fetchAll();
    expect(dbOps.resources.length).toBe(1);
    expect(new Date(dbOps.resources[0].session.expiresAt) > new Date()).toBe(
      true
    );
    const expireDate = new Date();
    expireDate.setMinutes(expireDate.getMinutes() + 121);
    expect(new Date(dbOps.resources[0].session.expiresAt) < expireDate).toBe(
      true
    );
  });

  test('Fail - Use unregistered refreshToken', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Create RefreshToken
    const currentDate = new Date();
    const tokenContents: AuthToken = {
      id: 'testuser1',
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
      .send({id: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);

    // Logout request
    response = await request(testEnv.expressServer.app)
      .delete('/auth/logout')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`]);
    expect(response.status).toBe(401);

    // Cookie Clear Check (Should not be cleared)
    expect(response.header['set-cookie']).toBeUndefined();

    // DB Check
    const dbOps = await testEnv.dbClient
      .container(ADMIN)
      .items.query('SELECT * FROM admin AS a WHERE a.id = "testuser1"')
      .fetchAll();
    expect(dbOps.resources.length).toBe(1);
    expect(new Date(dbOps.resources[0].session.expiresAt) > new Date()).toBe(
      true
    );
    const expireDate = new Date();
    expireDate.setMinutes(expireDate.getMinutes() + 121);
    expect(new Date(dbOps.resources[0].session.expiresAt) < expireDate).toBe(
      true
    );
  });

  test('Fail - Use expired refreshToken', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Login request
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({id: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);
    const refreshToken = response.header['set-cookie'][1]
      .split('; ')[0]
      .split('=')[1];

    // Logout request
    const affectedSessions = await invalidateToken(testEnv.dbClient, 121);
    expect(affectedSessions).toBe(1);
    response = await request(testEnv.expressServer.app)
      .delete('/auth/logout')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`]);
    expect(response.status).toBe(401);

    // Cookie Clear Check (Should not be cleared)
    expect(response.header['set-cookie']).toBeUndefined();

    // Check DB Server - Meaningless here
  });

  test('Fail - Use refreshToken generated with wrong secret key', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Create RefreshToken
    const tokenContents: AuthToken = {
      id: 'testuser1',
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
      .send({id: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);

    // Logout request
    response = await request(testEnv.expressServer.app)
      .delete('/auth/logout')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`]);
    expect(response.status).toBe(401);

    // Cookie Clear Check (Should not be cleared)
    expect(response.header['set-cookie']).toBeUndefined();

    // DB Check
    const dbOps = await testEnv.dbClient
      .container(ADMIN)
      .items.query('SELECT * FROM admin AS a WHERE a.id = "testuser1"')
      .fetchAll();
    expect(dbOps.resources.length).toBe(1);
    expect(new Date(dbOps.resources[0].session.expiresAt) > new Date()).toBe(
      true
    );
    const expireDate = new Date();
    expireDate.setMinutes(expireDate.getMinutes() + 121);
    expect(new Date(dbOps.resources[0].session.expiresAt) < expireDate).toBe(
      true
    );
  });

  test('Fail - Use refreshToken generated with wrong type value', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Create RefreshToken
    const tokenContents: AuthToken = {
      id: 'testuser1',
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
      .send({id: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);

    // Logout request
    response = await request(testEnv.expressServer.app)
      .delete('/auth/logout')
      .set('Cookie', [`X-REFRESH-TOKEN=${accessToken}`]);
    expect(response.status).toBe(401);

    // Cookie Clear Check (Should not be cleared)
    expect(response.header['set-cookie']).toBeUndefined();

    // DB Check
    const dbOps = await testEnv.dbClient
      .container(ADMIN)
      .items.query('SELECT * FROM admin AS a WHERE a.id = "testuser1"')
      .fetchAll();
    expect(dbOps.resources.length).toBe(1);
    expect(new Date(dbOps.resources[0].session.expiresAt) > new Date()).toBe(
      true
    );
    const expireDate = new Date();
    expireDate.setMinutes(expireDate.getMinutes() + 121);
    expect(new Date(dbOps.resources[0].session.expiresAt) < expireDate).toBe(
      true
    );
  });

  test('Fail - No Token', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Login request
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({id: 'testuser1', password: 'Password13!'});
    expect(response.status).toBe(200);

    // Logout request
    response = await request(testEnv.expressServer.app).delete('/auth/logout');
    expect(response.status).toBe(401);

    // Cookie Clear Check (Should not be cleared)
    expect(response.header['set-cookie']).toBeUndefined();

    // DB Check
    const dbOps = await testEnv.dbClient
      .container(ADMIN)
      .items.query('SELECT * FROM admin AS a WHERE a.id = "testuser1"')
      .fetchAll();
    expect(dbOps.resources.length).toBe(1);
    expect(new Date(dbOps.resources[0].session.expiresAt) > new Date()).toBe(
      true
    );
    const expireDate = new Date();
    expireDate.setMinutes(expireDate.getMinutes() + 121);
    expect(new Date(dbOps.resources[0].session.expiresAt) < expireDate).toBe(
      true
    );
  });
});
