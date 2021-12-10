/**
 * Jest unit test for POST /auth/login method
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

// eslint-disable-next-line node/no-unpublished-import
import * as request from 'supertest';
import * as jwt from 'jsonwebtoken';
import TestEnv from '../../TestEnv';
import AuthToken from '../../../src/datatypes/authentication/AuthToken';
import deleteAdmin from '../../../src/functions/utils/deleteAdmin';

describe('POST /auth/login - login', () => {
  let testEnv: TestEnv;

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
    // login request
    const loginCredentials = {
      username: 'testuser1',
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
    expect(tokenPayload.username).toBe('testuser1');
    expect(tokenPayload.type).toBe('access');
    // Parse Refresh Token
    cookie = response.header['set-cookie'][1].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-REFRESH-TOKEN'); // check for Refresh Token Name
    tokenPayload = jwt.verify(
      cookie[1],
      testEnv.testConfig.jwt.refreshKey,
      jwtOption
    ) as AuthToken; // Check for RefreshToken contents
    expect(tokenPayload.username).toBe('testuser1');
    expect(tokenPayload.type).toBe('refresh');

    // Check database
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM admin_session WHERE username = ?',
      'testuser1'
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].token).toBe(cookie[1]);
    const sessionExpires = new Date(queryResult[0].expires);
    const expectedExpires = new Date();
    expect(sessionExpires > expectedExpires).toBe(true);
    expectedExpires.setMinutes(expectedExpires.getMinutes() + 121);
    expect(sessionExpires < expectedExpires).toBe(true);
  });

  test('Success - Login twice', async () => {
    // login request
    const loginCredentials = {
      username: 'testuser1',
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
    expect(tokenPayload.username).toBe('testuser1');
    expect(tokenPayload.type).toBe('access');
    // Parse Refresh Token
    cookie = response.header['set-cookie'][1].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-REFRESH-TOKEN'); // check for Refresh Token Name
    tokenPayload = jwt.verify(
      cookie[1],
      testEnv.testConfig.jwt.refreshKey,
      jwtOption
    ) as AuthToken; // Check for RefreshToken contents
    expect(tokenPayload.username).toBe('testuser1');
    expect(tokenPayload.type).toBe('refresh');

    // Check database
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM admin_session WHERE username = ?',
      'testuser1'
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].token).toBe(cookie[1]);
    const sessionExpires = new Date(queryResult[0].expires);
    const expectedExpires = new Date();
    expect(sessionExpires > expectedExpires).toBe(true);
    expectedExpires.setMinutes(expectedExpires.getMinutes() + 121);
    expect(sessionExpires < expectedExpires).toBe(true);
  });

  test('Fail - Missing Field', async () => {
    // login request - missing password
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send({username: 'testuser2'});
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
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM admin_session WHERE username = ?',
      'testuser2'
    );
    expect(queryResult.length).toBe(0);
  });

  test('Fail - Additional Field', async () => {
    // request - Additional Field
    const loginCredentials = {
      username: 'testuser1',
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
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM admin_session WHERE username = ?',
      'testuser1'
    );
    expect(queryResult.length).toBe(0);
  });

  test('Fail - Removed User', async () => {
    // Call deleteAdmin function
    const result = await deleteAdmin('testuser1', testEnv.testConfig);
    expect(result.affectedRows).toBe(1);

    // login request
    const loginCredentials = {
      username: 'testuser1',
      password: 'Password13!',
    };
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(401);
    loginCredentials.username = 'testuser1_r';
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(401);
  });

  test('Fail - Not existing user', async () => {
    // request - Invalid username
    const usernameTestList = [
      'abcdefabcdef1',
      'abcde',
      'abcd@f',
      'Abcdef',
      '1abcdef',
      '123456',
      'adminadminadmin',
    ];
    for (const username of usernameTestList) {
      const loginCredentials = {
        username: username,
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
      const queryResult = await testEnv.dbClient.query(
        'SELECT * FROM admin_session WHERE username = ?',
        username
      );
      expect(queryResult.length).toBe(0);
    }

    // request - Not-existing username
    const loginCredentials = {
      username: 'admin2',
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
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM admin_session WHERE username = ?',
      'admin2'
    );
    expect(queryResult.length).toBe(0);
  });

  test('Fail - Password not matching', async () => {
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
        username: 'testuser1',
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
    let queryResult = await testEnv.dbClient.query(
      'SELECT * FROM admin_session WHERE username = ?',
      'testuser1'
    );
    expect(queryResult.length).toBe(0);

    // request - Incorrect password
    const loginCredentials = {
      username: 'testuser1',
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
    queryResult = await testEnv.dbClient.query(
      'SELECT * FROM admin_session WHERE username = ?',
      'testuser1'
    );
    expect(queryResult.length).toBe(0);
  });
});
