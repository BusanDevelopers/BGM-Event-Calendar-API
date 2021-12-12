/**
 * Jest unit test for utility to add new admin account
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as Cosmos from '@azure/cosmos';
import TestEnv from '../../TestEnv';
import TestConfig from '../../TestConfig';
import newAdmin from '../../../src/functions/utils/newAdmin';

describe('Utility - newAdmin function', () => {
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

    // Call newAdmin function
    const result = await newAdmin(
      'testadmin',
      'Password12!',
      'TEST',
      TestConfig.hash,
      testEnv.testConfig
    );
    expect(result.statusCode).toBe(201);

    // DB Check
    const queryResult = await testEnv.dbClient
      .container(ADMIN)
      .items.query('SELECT * FROM admin AS a WHERE a.id = "testadmin"')
      .fetchAll();
    expect(queryResult.resources.length).toBe(1);
    expect(queryResult.resources[0].id).toBe('testadmin');
    expect(queryResult.resources[0].name).toBe('TEST');
    expect(queryResult.resources[0].password).toBe(
      TestConfig.hash(
        'testadmin',
        new Date(queryResult.resources[0].memberSince).toISOString(),
        'Password12!'
      )
    );
  });

  test('Fail - Duplicated Username', async () => {
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    try {
      // Call newAdmin function
      await newAdmin(
        'testuser1',
        'Password12!',
        'TEST',
        TestConfig.hash,
        testEnv.testConfig
      );
      throw new Error();
    } catch (e) {
      expect((e as Error).message).toBe('Duplicated Username');
    }

    // DB Check
    const queryResult = await testEnv.dbClient
      .container(ADMIN)
      .items.query('SELECT * FROM admin AS a WHERE a.id = "testuser1"')
      .fetchAll();
    expect(queryResult.resources.length).toBe(1);
    expect(queryResult.resources[0].id).toBe('testuser1');
    expect(queryResult.resources[0].name).toBe('홍길동');
    expect(queryResult.resources[0].password).toBe(
      TestConfig.hash(
        'testuser1',
        new Date(queryResult.resources[0].memberSince).toISOString(),
        'Password13!'
      )
    );
  });

  test('Fail - Username Rule', async () => {
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    try {
      // Call newAdmin function
      await newAdmin(
        '12testadmin',
        'Password12!',
        'TEST',
        TestConfig.hash,
        testEnv.testConfig
      );
      throw new Error();
    } catch (e) {
      expect((e as Error).message).toBe('Invalid Username');
    }

    // DB Check
    const queryResult = await testEnv.dbClient
      .container(ADMIN)
      .items.query('SELECT * FROM admin AS a WHERE a.id = "123testadmin"')
      .fetchAll();
    expect(queryResult.resources.length).toBe(0);
  });

  test('Fail - Password Rule', async () => {
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    try {
      // Call newAdmin function
      await newAdmin(
        'testadmin',
        'password12!',
        'TEST',
        TestConfig.hash,
        testEnv.testConfig
      );
      throw new Error();
    } catch (e) {
      expect((e as Error).message).toBe('Invalid Password');
    }

    // DB Check
    const queryResult = await testEnv.dbClient
      .container(ADMIN)
      .items.query('SELECT * FROM admin AS a WHERE a.id = "testadmin"')
      .fetchAll();
    expect(queryResult.resources.length).toBe(0);
  });
});
