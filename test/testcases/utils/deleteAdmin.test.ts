/**
 * Jest unit test for utility to delete an existing admin account
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

// eslint-disable-next-line node/no-unpublished-import
import * as request from 'supertest';
import TestEnv from '../../TestEnv';
import TestConfig from '../../TestConfig';
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
    try {
      // Call deleteAdmin function
      const result = await deleteAdmin('testuser1', testEnv.testConfig);
      expect(result.affectedRows).toBe(1);

      // DB Check
      const queryResult = await testEnv.dbClient.query('SELECT * FROM admin');
      expect(queryResult.length).toBe(1);
      expect(queryResult[0].username).toBe('testuser2');
      expect(queryResult[0].name).toBe('김철수');
      expect(queryResult[0].password).toBe(
        TestConfig.hash(
          'testuser2',
          new Date(queryResult[0].membersince).toISOString(),
          'Password12!'
        )
      );
    } catch (e) {
      fail();
    }
  });

  test('Success - Have Sessions (Cleared)', async () => {
    // Login Request
    let loginCredentials = {username: 'testuser1', password: 'Password13!'};
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);

    loginCredentials = {username: 'testuser2', password: 'Password12!'};
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);

    try {
      // Call deleteAdmin function
      const result = await deleteAdmin('testuser1', testEnv.testConfig);
      expect(result.affectedRows).toBe(1);

      // DB Check - admin
      let queryResult = await testEnv.dbClient.query('SELECT * FROM admin');
      expect(queryResult.length).toBe(1);
      expect(queryResult[0].username).toBe('testuser2');
      expect(queryResult[0].name).toBe('김철수');
      expect(queryResult[0].password).toBe(
        TestConfig.hash(
          'testuser2',
          new Date(queryResult[0].membersince).toISOString(),
          'Password12!'
        )
      );

      // DB Check - admin_session
      queryResult = await testEnv.dbClient.query(
        'SELECT * FROM admin_session WHERE username = ?',
        'testuser1'
      );
      expect(queryResult.length).toBe(0);

      queryResult = await testEnv.dbClient.query('SELECT * FROM admin_session');
      expect(queryResult.length).toBe(1);
      expect(queryResult[0].username).toBe('testuser2');
    } catch (e) {
      fail();
    }
  });

  test('Fail - No matching username', async () => {
    try {
      // Call deleteAdmin function
      await deleteAdmin('notexist', testEnv.testConfig);
      fail();
    } catch (e) {
      expect((e as Error).message).toBe('Not Found');
    }

    // DB Check
    const queryResult = await testEnv.dbClient.query('SELECT * FROM admin');
    expect(queryResult.length).toBe(2);
  });
});
