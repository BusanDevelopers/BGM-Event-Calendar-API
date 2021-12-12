/**
 * Jest unit test for utility to delete an existing admin account
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

// eslint-disable-next-line node/no-unpublished-import
import * as request from 'supertest';
import * as Cosmos from '@azure/cosmos';
import TestEnv from '../../TestEnv';
import ExpressServer from '../../../src/ExpressServer';
import deleteAdmin from '../../../src/functions/utils/deleteAdmin';

describe('Utility - deleteAdmin function', () => {
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
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    try {
      // Call deleteAdmin function
      const result = await deleteAdmin('testuser1', testEnv.testConfig);
      expect(result.statusCode).toBe(204);

      // DB Check
      const queryResult = await testEnv.dbClient
        .container(ADMIN)
        .items.query("SELECT * FROM admin AS a WHERE a.id = 'testuser1'")
        .fetchAll();
      expect(queryResult.resources.length).toBe(0);
    } catch (e) {
      fail();
    }
  });

  test('Success - Have Sessions (Cleared)', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Login Request
    let loginCredentials = {id: 'testuser1', password: 'Password13!'};
    let response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);

    loginCredentials = {id: 'testuser2', password: 'Password12!'};
    response = await request(testEnv.expressServer.app)
      .post('/auth/login')
      .send(loginCredentials);
    expect(response.status).toBe(200);

    // Call deleteAdmin function
    const result = await deleteAdmin('testuser1', testEnv.testConfig);
    expect(result.statusCode).toBe(204);

    // DB Check - admin
    let queryResult = await testEnv.dbClient
      .container(ADMIN)
      .items.query("SELECT * FROM admin AS a WHERE a.id = 'testuser1'")
      .fetchAll();
    expect(queryResult.resources.length).toBe(0);

    // DB Check - admin account with session
    queryResult = await testEnv.dbClient
      .container(ADMIN)
      .items.query(
        'SELECT * FROM admin AS a WHERE a.id = "testuser2" AND a.session.token != null'
      )
      .fetchAll();
    expect(queryResult.resources.length).toBe(1);
  });

  test('Fail - No matching id', async () => {
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    try {
      // Call deleteAdmin function
      await deleteAdmin('notexist', testEnv.testConfig);
      fail();
    } catch (e) {
      expect((e as Error).message).toBe('Not Found');
    }

    // DB Check
    const queryResult = await testEnv.dbClient
      .container(ADMIN)
      .items.query('SELECT * FROM admin')
      .fetchAll();
    expect(queryResult.resources.length).toBe(2);
  });
});
