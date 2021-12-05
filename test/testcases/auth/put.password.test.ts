/**
 * Jest unit test for PUT /auth/password method
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

// eslint-disable-next-line node/no-unpublished-import
import * as request from 'supertest';
import * as jwt from 'jsonwebtoken';
import TestEnv from '../../TestEnv';
// eslint-disable-next-line node/no-unpublished-import
import MockDate from 'mockdate';
import TestConfig from '../../TestConfig';
import AuthToken from '../../../src/datatypes/authentication/AuthToken';

describe('PUT /auth/passward - Change Password', () => {
  let testEnv: TestEnv;

  // Information that used during the test
  const loginCredentials = {
    username: 'testuser1',
    password: 'Password13!',
  };

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
    // Login
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);
    const refreshToken = response.header['set-cookie'][1]
      .split('; ')[0]
      .split('=')[1];

    // Change Password Request
    response = await request(testEnv.expressServer.app)
      .put('/auth/password')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`])
      .send({currentPassword: 'Password13!', newPassword: 'NewPW1399!!'});
    expect(response.status).toBe(200);
    expect(response.header['set-cookie']).toBeUndefined();

    // DB Check - PW Changed
    let queryResult = await testEnv.dbClient.query(
      'SELECT * FROM admin WHERE username = ?',
      [loginCredentials.username]
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].password).toBe(
      TestConfig.hash(
        loginCredentials.username,
        new Date(queryResult[0].membersince).toISOString(),
        'NewPW1399!!'
      )
    );

    // DB Check - Session Not Changed
    queryResult = await testEnv.dbClient.query(
      'SELECT * FROM admin_session WHERE username = ?',
      [loginCredentials.username]
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].token).toBe(refreshToken);
  });

  test('Success - Token about to expire', async () => {
    // Login
    const mockDate = new Date();
    MockDate.set(mockDate);
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);
    const refreshToken = response.header['set-cookie'][1]
      .split('; ')[0]
      .split('=')[1];

    // Passed 110 min (Refresh token about to expire, access token expired)
    mockDate.setMinutes(mockDate.getMinutes() + 110);
    MockDate.set(mockDate);
    // Change Password Request
    response = await request(testEnv.expressServer.app)
      .put('/auth/password')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`])
      .send({currentPassword: 'Password13!', newPassword: 'NewPW1399!!'});
    expect(response.status).toBe(200);
    expect(response.header['set-cookie'].length).toBe(1);

    // Check Cookie and Token value
    const cookie = response.header['set-cookie'][0].split('; ')[0].split('=');
    expect(cookie[0]).toBe('X-REFRESH-TOKEN'); // Check for Refresh Token Name
    const tokenPayload = jwt.verify(
      cookie[1],
      testEnv.testConfig.jwt.refreshKey,
      {algorithms: ['HS512']}
    ) as AuthToken; // Check for AccessToken contents
    expect(tokenPayload.username).toBe('testuser1');
    expect(tokenPayload.type).toBe('refresh');

    // DB Check - PW Changed
    let queryResult = await testEnv.dbClient.query(
      'SELECT * FROM admin WHERE username = ?',
      [loginCredentials.username]
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].password).toBe(
      TestConfig.hash(
        loginCredentials.username,
        new Date(queryResult[0].membersince).toISOString(),
        'NewPW1399!!'
      )
    );

    // DB Check - Session Updated
    queryResult = await testEnv.dbClient.query(
      'SELECT * FROM admin_session WHERE username = ?',
      [loginCredentials.username]
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].token).toBe(cookie[1]);
  });

  test('Fail - Not authorized', async () => {
    // Login
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);
    const refreshToken = response.header['set-cookie'][1]
      .split('; ')[0]
      .split('=')[1];

    // Change Password Request without refreshToken
    response = await request(testEnv.expressServer.app)
      .put('/auth/password')
      .set('Cookie', ['X-REFRESH-TOKEN='])
      .send({currentPassword: 'Password13!', newPassword: 'NewPW1399!!'});
    expect(response.status).toBe(401);
    expect(response.body.error).toBe(
      'Authentication information is missing/invalid'
    );

    // DB Check - PW Not Changed
    let queryResult = await testEnv.dbClient.query(
      'SELECT * FROM admin WHERE username = ?',
      [loginCredentials.username]
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].password).toBe(
      TestConfig.hash(
        loginCredentials.username,
        new Date(queryResult[0].membersince).toISOString(),
        loginCredentials.password
      )
    );

    // DB Check - Session Not updated
    queryResult = await testEnv.dbClient.query(
      'SELECT * FROM admin_session WHERE username = ?',
      [loginCredentials.username]
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].token).toBe(refreshToken);
  });

  test('Fail - Missing required field', async () => {
    // Login
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);
    const refreshToken = response.header['set-cookie'][1]
      .split('; ')[0]
      .split('=')[1];

    // Change Password Request without currentPassword
    response = await request(testEnv.expressServer.app)
      .put('/auth/password')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`])
      .send({newPassword: 'NewPW1399!!'});
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    // DB Check - PW Not Changed
    let queryResult = await testEnv.dbClient.query(
      'SELECT * FROM admin WHERE username = ?',
      [loginCredentials.username]
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].password).toBe(
      TestConfig.hash(
        loginCredentials.username,
        new Date(queryResult[0].membersince).toISOString(),
        loginCredentials.password
      )
    );

    // DB Check - Session Not Changed
    queryResult = await testEnv.dbClient.query(
      'SELECT * FROM admin_session WHERE username = ?',
      [loginCredentials.username]
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].token).toBe(refreshToken);
  });

  test('Fail - Missing required field / Token about to expire', async () => {
    // Login
    const mockDate = new Date();
    MockDate.set(mockDate);
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);
    const refreshToken = response.header['set-cookie'][1]
      .split('; ')[0]
      .split('=')[1];

    // Passed 110 min (Refresh token about to expire, access token expired)
    mockDate.setMinutes(mockDate.getMinutes() + 110);
    MockDate.set(mockDate);
    // Change Password Request without newPassword
    response = await request(testEnv.expressServer.app)
      .put('/auth/password')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`])
      .send({currentPassword: 'Password13!'});
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    // DB Check - PW Not Changed
    let queryResult = await testEnv.dbClient.query(
      'SELECT * FROM admin WHERE username = ?',
      [loginCredentials.username]
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].password).toBe(
      TestConfig.hash(
        loginCredentials.username,
        new Date(queryResult[0].membersince).toISOString(),
        loginCredentials.password
      )
    );

    // DB Check - Session Not Updated
    queryResult = await testEnv.dbClient.query(
      'SELECT * FROM admin_session WHERE username = ?',
      [loginCredentials.username]
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].token).toBe(refreshToken);
  });

  test('Fail - Additional Field', async () => {
    // Login
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);
    const refreshToken = response.header['set-cookie'][1]
      .split('; ')[0]
      .split('=')[1];

    // Change Password Request with additional field
    response = await request(testEnv.expressServer.app)
      .put('/auth/password')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`])
      .send({
        currentPassword: 'Password13!',
        newPassword: 'NewPW1399!!',
        type: 'admin',
      });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    // DB Check - PW Not Changed
    let queryResult = await testEnv.dbClient.query(
      'SELECT * FROM admin WHERE username = ?',
      [loginCredentials.username]
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].password).toBe(
      TestConfig.hash(
        loginCredentials.username,
        new Date(queryResult[0].membersince).toISOString(),
        loginCredentials.password
      )
    );

    // DB Check - Session Not updated
    queryResult = await testEnv.dbClient.query(
      'SELECT * FROM admin_session WHERE username = ?',
      [loginCredentials.username]
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].token).toBe(refreshToken);
  });

  test('Fail - Additional Field / Token about to expire', async () => {
    // Login
    const mockDate = new Date();
    MockDate.set(mockDate);
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);
    const refreshToken = response.header['set-cookie'][1]
      .split('; ')[0]
      .split('=')[1];

    // Passed 110 min (Refresh token about to expire, access token expired)
    mockDate.setMinutes(mockDate.getMinutes() + 110);
    MockDate.set(mockDate);
    // Change Password Request with additional field
    response = await request(testEnv.expressServer.app)
      .put('/auth/password')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`])
      .send({
        currentPassword: 'Password13!',
        newPassword: 'NewPW1399!!',
        type: 'admin',
      });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    // DB Check - PW Not Changed
    let queryResult = await testEnv.dbClient.query(
      'SELECT * FROM admin WHERE username = ?',
      [loginCredentials.username]
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].password).toBe(
      TestConfig.hash(
        loginCredentials.username,
        new Date(queryResult[0].membersince).toISOString(),
        loginCredentials.password
      )
    );

    // DB Check - Session Not Updated
    queryResult = await testEnv.dbClient.query(
      'SELECT * FROM admin_session WHERE username = ?',
      [loginCredentials.username]
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].token).toBe(refreshToken);
  });

  test('Fail - New Password rule', async () => {
    // Login
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);
    const refreshToken = response.header['set-cookie'][1]
      .split('; ')[0]
      .split('=')[1];

    // Change Password Request with invalid new password
    response = await request(testEnv.expressServer.app)
      .put('/auth/password')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`])
      .send({currentPassword: 'Password13!', newPassword: 'newpw1399!!'});
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    // DB Check - PW Not Changed
    let queryResult = await testEnv.dbClient.query(
      'SELECT * FROM admin WHERE username = ?',
      [loginCredentials.username]
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].password).toBe(
      TestConfig.hash(
        loginCredentials.username,
        new Date(queryResult[0].membersince).toISOString(),
        loginCredentials.password
      )
    );

    // DB Check - Session Not updated
    queryResult = await testEnv.dbClient.query(
      'SELECT * FROM admin_session WHERE username = ?',
      [loginCredentials.username]
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].token).toBe(refreshToken);
  });

  test('Fail - New Password rule / Token about to expire', async () => {
    // Login
    const mockDate = new Date();
    MockDate.set(mockDate);
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);
    const refreshToken = response.header['set-cookie'][1]
      .split('; ')[0]
      .split('=')[1];

    // Passed 110 min (Refresh token about to expire, access token expired)
    mockDate.setMinutes(mockDate.getMinutes() + 110);
    MockDate.set(mockDate);
    // Change Password Request with invalid new password
    response = await request(testEnv.expressServer.app)
      .put('/auth/password')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`])
      .send({currentPassword: 'Password13!', newPassword: 'newpw1399!!'});
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    // DB Check - PW Not Changed
    let queryResult = await testEnv.dbClient.query(
      'SELECT * FROM admin WHERE username = ?',
      [loginCredentials.username]
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].password).toBe(
      TestConfig.hash(
        loginCredentials.username,
        new Date(queryResult[0].membersince).toISOString(),
        loginCredentials.password
      )
    );

    // DB Check - Session Not Updated
    queryResult = await testEnv.dbClient.query(
      'SELECT * FROM admin_session WHERE username = ?',
      [loginCredentials.username]
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].token).toBe(refreshToken);
  });

  test('Fail - Current Password not match', async () => {
    // Login
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);
    const refreshToken = response.header['set-cookie'][1]
      .split('; ')[0]
      .split('=')[1];

    // Change Password Request with wrong current password
    response = await request(testEnv.expressServer.app)
      .put('/auth/password')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`])
      .send({currentPassword: 'Password12!', newPassword: 'NewPW1399!!'});
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    // DB Check - PW Not Changed
    let queryResult = await testEnv.dbClient.query(
      'SELECT * FROM admin WHERE username = ?',
      [loginCredentials.username]
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].password).toBe(
      TestConfig.hash(
        loginCredentials.username,
        new Date(queryResult[0].membersince).toISOString(),
        loginCredentials.password
      )
    );

    // DB Check - Session Not updated
    queryResult = await testEnv.dbClient.query(
      'SELECT * FROM admin_session WHERE username = ?',
      [loginCredentials.username]
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].token).toBe(refreshToken);
  });

  test('Fail - Current Password not match / Token about to expire', async () => {
    // Login
    const mockDate = new Date();
    MockDate.set(mockDate);
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);
    const refreshToken = response.header['set-cookie'][1]
      .split('; ')[0]
      .split('=')[1];

    // Passed 110 min (Refresh token about to expire, access token expired)
    mockDate.setMinutes(mockDate.getMinutes() + 110);
    MockDate.set(mockDate);
    // Change Password Request with wrong current password
    response = await request(testEnv.expressServer.app)
      .put('/auth/password')
      .set('Cookie', [`X-REFRESH-TOKEN=${refreshToken}`])
      .send({currentPassword: 'Password12!', newPassword: 'NewPW1399!!'});
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    // DB Check - PW Not Changed
    let queryResult = await testEnv.dbClient.query(
      'SELECT * FROM admin WHERE username = ?',
      [loginCredentials.username]
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].password).toBe(
      TestConfig.hash(
        loginCredentials.username,
        new Date(queryResult[0].membersince).toISOString(),
        loginCredentials.password
      )
    );

    // DB Check - Session Not Updated
    queryResult = await testEnv.dbClient.query(
      'SELECT * FROM admin_session WHERE username = ?',
      [loginCredentials.username]
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].token).toBe(refreshToken);
  });
});
