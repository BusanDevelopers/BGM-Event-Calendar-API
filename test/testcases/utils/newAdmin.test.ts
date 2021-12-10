/**
 * Jest unit test for utility to add new admin account
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import TestEnv from '../../TestEnv';
import TestConfig from '../../TestConfig';
import newAdmin from '../../../src/functions/utils/newAdmin';

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
      // Call newAdmin function
      const result = await newAdmin(
        'testadmin',
        'Password12!',
        'TEST',
        TestConfig.hash,
        testEnv.testConfig
      );
      expect(result.affectedRows).toBe(1);

      // DB Check
      const queryResult = await testEnv.dbClient.query(
        'SELECT * FROM admin WHERE username = ?',
        'testadmin'
      );
      expect(queryResult.length).toBe(1);
      expect(queryResult[0].username).toBe('testadmin');
      expect(queryResult[0].name).toBe('TEST');
      expect(queryResult[0].password).toBe(
        TestConfig.hash(
          'testadmin',
          new Date(queryResult[0].membersince).toISOString(),
          'Password12!'
        )
      );
    } catch (e) {
      fail();
    }
  });

  test('Fail - Duplicated Username', async () => {
    try {
      // Call newAdmin function
      await newAdmin(
        'testuser1',
        'Password12!',
        'TEST',
        TestConfig.hash,
        testEnv.testConfig
      );
      fail();
    } catch (e) {
      expect((e as Error).message).toBe('Duplicated Username');
    }

    // DB Check
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM admin WHERE username = ?',
      'testuser1'
    );
    expect(queryResult.length).toBe(1);
    expect(queryResult[0].username).toBe('testuser1');
    expect(queryResult[0].name).toBe('홍길동');
    expect(queryResult[0].password).toBe(
      TestConfig.hash(
        'testuser1',
        new Date(queryResult[0].membersince).toISOString(),
        'Password13!'
      )
    );
  });

  test('Fail - Username Rule', async () => {
    try {
      // Call newAdmin function
      await newAdmin(
        '12testadmin',
        'Password12!',
        'TEST',
        TestConfig.hash,
        testEnv.testConfig
      );
      fail();
    } catch (e) {
      expect((e as Error).message).toBe('Invalid Username');
    }

    // DB Check
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM admin WHERE username = ?',
      '123testadmin'
    );
    expect(queryResult.length).toBe(0);
  });

  test('Fail - Password Rule', async () => {
    try {
      // Call newAdmin function
      await newAdmin(
        'testadmin',
        'password12!',
        'TEST',
        TestConfig.hash,
        testEnv.testConfig
      );
      fail();
    } catch (e) {
      expect((e as Error).message).toBe('Invalid Password');
    }

    // DB Check
    const queryResult = await testEnv.dbClient.query(
      'SELECT * FROM admin WHERE username = ?',
      'testadmin'
    );
    expect(queryResult.length).toBe(0);
  });
});
