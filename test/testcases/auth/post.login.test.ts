/**
 * Jest unit test for POST /auth/login method
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
import deleteAdmin from '../../../src/functions/utils/deleteAdmin';

describe('POST /auth/login - login', () => {
  let testEnv: TestEnv;

  // DB Container ID
  const ADMIN = 'admin';

  beforeAll(() => {
    jest.setTimeout(120000);
  });

  beforeEach(async () => {
    // Setup TestEnv
    testEnv = new TestEnv(expect.getState().currentTestName);

    // Start Test Environment
    await testEnv.start();
  });

  afterEach(async () => {
    await testEnv.stop();
  });

  test('Success', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // login request
    const loginCredentials = {
      id: 'testuser1',
      password: 'Password13!',
    };
    const response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);

    // Check Cookie & Token Information
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
    // Parse Refresh Token
    cookie = response.header['set-cookie'][1].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-REFRESH-TOKEN'); // check for Refresh Token Name
    tokenPayload = jwt.verify(
      cookie[1],
      testEnv.testConfig.jwt.refreshKey,
      jwtOption
    ) as AuthToken; // Check for RefreshToken contents
    expect(tokenPayload.id).toBe('testuser1');
    expect(tokenPayload.type).toBe('refresh');

    // Check database
    const queryResult = await testEnv.dbClient
      .container(ADMIN)
      .items.query(
        'SELECT a.id, a.session.token, a.session.expiresAt FROM admin AS a WHERE a.id = "testuser1" AND a.session != null'
      )
      .fetchAll();
    expect(queryResult.resources.length).toBe(1);
    expect(queryResult.resources[0].token).toBe(cookie[1]);
    const sessionExpires = new Date(queryResult.resources[0].expiresAt);
    const expectedExpires = new Date();
    expect(sessionExpires > expectedExpires).toBe(true);
    expectedExpires.setMinutes(expectedExpires.getMinutes() + 121);
    expect(sessionExpires < expectedExpires).toBe(true);
  });

  test('Success - Login twice', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // login request
    const loginCredentials = {
      id: 'testuser1',
      password: 'Password13!',
    };
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);
    // Another login request
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);

    // Check Cookie & Token Information
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
    // Parse Refresh Token
    cookie = response.header['set-cookie'][1].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-REFRESH-TOKEN'); // check for Refresh Token Name
    tokenPayload = jwt.verify(
      cookie[1],
      testEnv.testConfig.jwt.refreshKey,
      jwtOption
    ) as AuthToken; // Check for RefreshToken contents
    expect(tokenPayload.id).toBe('testuser1');
    expect(tokenPayload.type).toBe('refresh');

    // Check database
    const queryResult = await testEnv.dbClient
      .container(ADMIN)
      .items.query(
        'SELECT a.id, a.session.token, a.session.expiresAt FROM admin AS a WHERE a.id = "testuser1" AND a.session != null'
      )
      .fetchAll();
    expect(queryResult.resources.length).toBe(1);
    expect(queryResult.resources[0].token).toBe(cookie[1]);
    const sessionExpires = new Date(queryResult.resources[0].expiresAt);
    const expectedExpires = new Date();
    expect(sessionExpires > expectedExpires).toBe(true);
    expectedExpires.setMinutes(expectedExpires.getMinutes() + 121);
    expect(sessionExpires < expectedExpires).toBe(true);
  });

  test('Fail - Missing Field', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // login request - missing password
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({id: 'testuser2'});
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    // Check Cookie & token Information
    expect(response.header['set-cookie']).toBeUndefined();

    // request - empty object body
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({});
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    // Check Cookie & token Information
    expect(response.header['set-cookie']).toBeUndefined();

    // Check database
    const queryResult = await testEnv.dbClient
      .container(ADMIN)
      .items.query(
        'SELECT a.id, a.session.token, a.session.expiresAt FROM admin AS a WHERE a.id = "testuser2" AND a.session != null'
      )
      .fetchAll();
    expect(queryResult.resources.length).toBe(0);
  });

  test('Fail - Additional Field', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // request - Additional Field
    const loginCredentials = {
      id: 'testuser1',
      password: 'Password13!',
      nickname: 'dummy',
    };
    const response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    // Check Cookie & token Information
    expect(response.header['set-cookie']).toBeUndefined();

    // Check database
    const queryResult = await testEnv.dbClient
      .container(ADMIN)
      .items.query(
        'SELECT a.id, a.session.token, a.session.expiresAt FROM admin AS a WHERE a.id = "testuser1" AND a.session != null'
      )
      .fetchAll();
    expect(queryResult.resources.length).toBe(0);
  });

  test('Fail - Removed User', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Call deleteAdmin function
    const result = await deleteAdmin('testuser1', testEnv.testConfig);
    expect(result.statusCode).toBe(204);

    // login request
    const loginCredentials = {
      id: 'testuser1',
      password: 'Password13!',
    };
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(401);
    loginCredentials.id = 'testuser1';
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(401);
  });

  test('Fail - Not existing user', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // request - Invalid id
    const idTestList = [
      'abcdefabcdef1',
      'abcde',
      'abcd@f',
      'Abcdef',
      '1abcdef',
      '123456',
      'adminadminadmin',
    ];
    for (const id of idTestList) {
      const loginCredentials = {
        id: id,
        password: 'Password13!',
      };
      const response = await request(testEnv.expressServer.app)
        .post('/auth/login')
        .send(loginCredentials);
      expect(response.status).toBe(401);
      expect(response.body.error).toBe(
        'Authentication information is missing/invalid'
      );

      // Check Cookie & token Information
      expect(response.header['set-cookie']).toBeUndefined();

      // Check database
      const queryResult = await testEnv.dbClient
        .container(ADMIN)
        .items.query(
          `SELECT a.id, a.session.token, a.session.expiresAt FROM admin AS a WHERE a.id = "${id}" AND a.session != null`
        )
        .fetchAll();
      expect(queryResult.resources.length).toBe(0);
    }

    // request - Not-existing id
    const loginCredentials = {
      id: 'admin2',
      password: 'Password13!',
    };
    const response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(401);
    expect(response.body.error).toBe(
      'Authentication information is missing/invalid'
    );

    // Check Cookie & token Information
    expect(response.header['set-cookie']).toBeUndefined();

    // Check database
    const queryResult = await testEnv.dbClient
      .container(ADMIN)
      .items.query(
        'SELECT a.id, a.session.token, a.session.expiresAt FROM admin AS a WHERE a.id = "admin2" AND a.session != null'
      )
      .fetchAll();
    expect(queryResult.resources.length).toBe(0);
  });

  test('Fail - Password not matching', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Request - Invalid Password
    const passwordTestList = [
      'passwordPassword',
      'SuccPassword12',
      'SuccPassword!',
      'succpassword12!',
      'SUCCPASSWORD12!',
      'SuccPassword12()',
      'abcSuccPassword12!',
      'aaaSuccPassword12!',
      'cbaSuccPassword12!',
      'tesSuccPassword12!',
      'setSuccPassword12!',
      'Succ12!',
      'Succ1234!!Succ1234!!Succ1234!!Succ1234!!Succ1234!!22',
    ];
    for (const password of passwordTestList) {
      const loginCredentials = {
        id: 'testuser1',
        password: password,
      };
      const response = await request(testEnv.expressServer.app)
        .post('/auth/login')
        .send(loginCredentials);
      expect(response.status).toBe(401);
      expect(response.body.error).toBe(
        'Authentication information is missing/invalid'
      );

      // Check Cookie & token Information
      expect(response.header['set-cookie']).toBeUndefined();
    }

    // Check database
    let queryResult = await testEnv.dbClient
      .container(ADMIN)
      .items.query(
        'SELECT a.id, a.session.token, a.session.expiresAt FROM admin AS a WHERE a.id = "testuser1" AND a.session != null'
      )
      .fetchAll();
    expect(queryResult.resources.length).toBe(0);

    // request - Incorrect password
    const loginCredentials = {
      id: 'testuser1',
      password: 'Password12!',
    };
    const response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(401);
    expect(response.body.error).toBe(
      'Authentication information is missing/invalid'
    );

    // Check Cookie & token Information
    expect(response.header['set-cookie']).toBeUndefined();

    // Check database
    queryResult = await testEnv.dbClient
      .container(ADMIN)
      .items.query(
        'SELECT a.id, a.session.token, a.session.expiresAt FROM admin AS a WHERE a.id = "testuser1" AND a.session != null'
      )
      .fetchAll();
    expect(queryResult.resources.length).toBe(0);
  });
});
