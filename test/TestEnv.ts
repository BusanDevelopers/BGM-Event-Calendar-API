/**
 * Setup test environment
 *  - Setup Database for testing
 *  - Build table that will be used during the testing
 *  - Setup express server
 *
 * Teardown test environment after test
 *  - Remove used table and close database connection from the express server
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as crypto from 'crypto';
import * as mariadb from 'mariadb';
import TestConfig from './TestConfig';
import ExpressServer from '../src/ExpressServer';

/**
 * Class for Test Environment
 */
export default class TestEnv {
  testConfig: TestConfig; // Configuration Object (to use hash function later)
  expressServer: ExpressServer; // Express Server Object
  dbClient: mariadb.Pool; // DB Client Object
  dbIdentifier: string; // unique identifier string for the database

  /**
   * Constructor for TestEnv
   *  - Setup express server
   *  - Setup db client
   *
   * @param identifier Identifier to specify the test
   */
  constructor(identifier: string) {
    // Hash identifier to create new identifier string
    this.dbIdentifier = crypto
      .createHash('md5')
      .update(identifier)
      .digest('hex');
    // Generate TestConfig obj
    this.testConfig = new TestConfig(this.dbIdentifier);

    // Setup DB Connection Pool
    this.dbClient = mariadb.createPool({
      host: this.testConfig.db.url,
      port: this.testConfig.db.port,
      user: this.testConfig.db.username,
      password: this.testConfig.db.password,
      database: this.testConfig.db.defaultDatabase,
      compress: true,
    });

    // Setup Express Server
    this.expressServer = new ExpressServer(this.testConfig);
  }

  /**
   * beforeEach test case, run this function
   * - Setup Database for testing
   * - Build table that will be used during the testing
   */
  async start(): Promise<void> {
    // Create test database
    const dbConnection = await mariadb.createConnection({
      host: this.testConfig.db.url,
      port: this.testConfig.db.port,
      user: this.testConfig.db.username,
      password: this.testConfig.db.password,
      compress: true,
    });
    await dbConnection.query(`CREATE DATABASE db_${this.dbIdentifier};`);
    await dbConnection.end();

    // Create resources
    // admin table
    await this.dbClient.query(
      String.prototype.concat(
        'CREATE TABLE admin (',
        'username VARCHAR(12) NOT NULL PRIMARY KEY,',
        'password CHAR(88) NOT NULL,',
        'name VARCHAR(255) NOT NULL,',
        'membersince TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP',
        ') CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;'
      )
    );

    // admin_session table
    await this.dbClient.query(
      String.prototype.concat(
        'CREATE TABLE admin_session (',
        'username VARCHAR(12) NOT NULL UNIQUE,',
        'FOREIGN KEY (username) REFERENCES admin(username) ON DELETE CASCADE ON UPDATE CASCADE,',
        'INDEX index_username(username),',
        'token VARCHAR(255) NOT NULL PRIMARY KEY,',
        'expires TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP',
        ') CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;'
      )
    );

    // event table
    await this.dbClient.query(
      String.prototype.concat(
        'CREATE TABLE event (',
        'id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,',
        'date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,',
        'INDEX index_date(date),',
        'name VARCHAR(255) NOT NULL,',
        'detail MEDIUMTEXT NULL DEFAULT NULL,',
        'category VARCHAR(255) NULL DEFAULT NULL,',
        'editor VARCHAR(12) NOT NULL,',
        'FOREIGN KEY (editor) REFERENCES admin(username) ON DELETE CASCADE ON UPDATE CASCADE',
        ') CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;'
      )
    );

    // participation table
    await this.dbClient.query(
      String.prototype.concat(
        'CREATE TABLE participation (',
        'id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,',
        'event_id INT(11) NOT NULL,',
        'FOREIGN KEY (event_id) REFERENCES event(id) ON DELETE CASCADE ON UPDATE CASCADE,',
        'INDEX index_event_id(event_id),',
        'date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,',
        'participant_name VARCHAR(255) NOT NULL,',
        'INDEX index_participant_name(participant_name),',
        'phone_number VARCHAR(20) NULL DEFAULT NULL,',
        'email VARCHAR(255) NOT NULL,',
        'INDEX index_email(email),',
        'comment TEXT NULL DEFAULT NULL',
        ') CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;'
      )
    );

    // admin data
    const adminSamples = [];
    // testuser1, Password13!, 홍길동
    let adminTimestamp = new Date('2021-03-10T00:50:43.000Z');
    adminSamples.push([
      'testuser1',
      TestConfig.hash('testuser1', adminTimestamp.toISOString(), 'Password13!'),
      '홍길동',
      adminTimestamp,
    ]);
    // testuser2, Password12!,김철수
    adminTimestamp = new Date('2021-03-07T01:15:42.000Z');
    adminSamples.push([
      'testuser2',
      TestConfig.hash('testuser2', adminTimestamp.toISOString(), 'Password12!'),
      '김철수',
      adminTimestamp,
    ]);
    await this.dbClient.batch(
      String.prototype.concat(
        'INSERT INTO admin ',
        '(username, password, name, membersince) ',
        'VALUES (?, ?, ?, ?)'
      ),
      adminSamples
    );

    // event data
    const eventSamples = [];
    // 2021-10-31, 할로윈 파티, N/A, 네트워킹, testuser1
    eventSamples.push([
      new Date(2021, 9, 31),
      '할로윈 파티',
      null,
      '네트워킹',
      'testuser1',
    ]);
    // 2021-08-15, 광복절, N/A, N/A, testuser2
    eventSamples.push([
      new Date(2021, 7, 15),
      '광복절',
      null,
      null,
      'testuser2',
    ]);
    // 2021-08-26, 비대면 정기 모임, 음에서 비대면 정기 모임을 개최합니다., 비대면 모임, testuser2
    eventSamples.push([
      new Date(2021, 7, 26),
      '비대면 정기 모임',
      '음에서 비대면 정기 모임을 개최합니다.',
      '비대면 모임',
      'testuser2',
    ]);
    // 2021-12-31, 연말 결산 모임, 연말을 맞아 BGM 회원끼리 모여 서로의 일년은 어땠는지, 내년 목표는 무엇인지에 관해 이야기해보려 합니다., N/A, testuser1
    eventSamples.push([
      new Date(2021, 11, 31),
      '연말 결산 모임',
      '연말을 맞아 BGM 회원끼리 모여 서로의 일년은 어땠는지, 내년 목표는 무엇인지에 관해 이야기해보려 합니다.',
      null,
      'testuser1',
    ]);
    await this.dbClient.batch(
      String.prototype.concat(
        'INSERT INTO event ',
        '(date, name, detail, category, editor) ',
        'VALUES (?, ?, ?, ?, ?)'
      ),
      eventSamples
    );

    // participation data
    const participationSamples = [];
    // event 1, 2021-08-17, 김영희, null, yhkim@gmail.com, null
    participationSamples.push([
      1,
      new Date('2021-08-17'),
      '김영희',
      null,
      'yhkim@gmail.com',
      null,
    ]);
    // event 3, 2021-08-20, 김영희, 010-1234-5678, yhkim@gmail.com, 음 계정은 yhkim 입니다.
    participationSamples.push([
      3,
      new Date('2021-08-20'),
      '김영희',
      '01012345678',
      'yhkim@gmail.com',
      '음 계정은 yhkim 입니다.',
    ]);
    // event 3, 2021-08-21, 김말숙, null, mskim@gmail.com, 음 계정은 mskim 입니다.
    participationSamples.push([
      3,
      new Date('2021-08-21'),
      '김말숙',
      null,
      'mskim@gmail.com',
      '음 계정은 mskim 입니다.',
    ]);
    // event 4, 2021-08-21, 김말숙, 010-4567-1234, mskim@gmail.com, null
    participationSamples.push([
      4,
      new Date('2021-08-21'),
      '김말숙',
      '01045671234',
      'mskim@gmail.com',
      null,
    ]);
    await this.dbClient.batch(
      String.prototype.concat(
        'INSERT INTO participation ',
        '(event_id, date, participant_name, phone_number, email, comment) ',
        'VALUES (?, ?, ?, ?, ?, ?)'
      ),
      participationSamples
    );
  }

  /**
   * Teardown test environment after test
   *  - Remove used resources (DB)
   *  - close database/redis connection from the express server
   */
  async stop(): Promise<void> {
    // Drop database
    await this.dbClient.query(`DROP DATABASE db_${this.dbIdentifier}`);

    // Close database connection of the express server
    await this.expressServer.closeServer();

    // Close database connection used during tests
    await this.dbClient.end();
  }
}
