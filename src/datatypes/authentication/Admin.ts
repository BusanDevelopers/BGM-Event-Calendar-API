/**
 * Define type and CRUD methods for each admin entry
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as mariadb from 'mariadb';
import LoginCredentials from '../authentication/LoginCredentials';
import NotFoundError from '../../exceptions/NotFoundError';
import HTTPError from '../../exceptions/HTTPError';

/**
 * Class for Admin
 */
export default class Admin implements LoginCredentials {
  username: string;
  password: string; // Hashed Password
  name: string;
  memberSince: Date;

  /**
   * Constructor for Admin Object
   *
   * @param username unique username of the admin (Maximum 12 character)
   * @param password admin's password
   * @param name name of admin
   * @param memberSince When user signed up
   */
  constructor(
    username: string,
    password: string,
    name: string,
    memberSince: Date
  ) {
    this.username = username;
    this.password = password;
    this.name = name;
    this.memberSince = memberSince;
  }

  /**
   * Create new entry in admin table
   *
   * @param dbClient DB Connection Pool (MariaDB)
   * @param admin Admin Information
   * @return {Promise<mariadb.UpsertResult>} db operation result
   */
  static async create(
    dbClient: mariadb.Pool,
    admin: Admin
  ): Promise<mariadb.UpsertResult> {
    try {
      return await dbClient.query(
        String.prototype.concat(
          'INSERT INTO admin ',
          '(username, password, name, membersince) ',
          'VALUES (?, ?, ?, ?)'
        ),
        [admin.username, admin.password, admin.name, admin.memberSince]
      );
    } catch (e) {
      /* istanbul ignore else */
      if (e.code === 'ER_DUP_ENTRY') {
        throw new HTTPError(400, 'Duplicated Username');
      } else {
        throw e;
      }
    }
  }

  /**
   * Retrieve an Admin entry from DB
   *
   * @param dbClient DB Connection Pool
   * @param username username associated with the Admin
   * @return {Promise<Admin>} return information of Admin associated with the username
   */
  static async read(dbClient: mariadb.Pool, username: string): Promise<Admin> {
    const queryResult = await dbClient.query(
      'SELECT * FROM admin WHERE username = ?',
      username
    );
    if (queryResult.length !== 1) {
      throw new NotFoundError();
    }

    return new Admin(
      queryResult[0].username,
      queryResult[0].password,
      queryResult[0].name,
      new Date(queryResult[0].membersince)
    );
  }

  /**
   * Delete an existing entry in admin table
   *
   * @param dbClient DB Connection Pool
   * @param username username associated with the Admin
   * @return {Promise<mariadb.UpsertResult>} db operation result
   */
  static async delete(
    dbClient: mariadb.Pool,
    username: string
  ): Promise<mariadb.UpsertResult> {
    const queryResult = await dbClient.query(
      'DELETE FROM admin WHERE username = ?',
      username
    );
    if (queryResult.affectedRows === 0) {
      throw new NotFoundError();
    }
    return queryResult;
  }
}
