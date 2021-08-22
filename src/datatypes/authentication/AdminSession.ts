/**
 * Define type and CRUD methods for each admin_session entry
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as mariadb from 'mariadb';

/**
 * Class for AdminSession
 */
export default class AdminSession {
  username: string;
  token: string;
  expires: Date;

  /**
   * Constructor for AdminSession Object
   *
   * @param username unique username of the admin
   * @param refreshToken refreshToken associated with the session
   * @param expires When the token expires
   */
  constructor(username: string, refreshToken: string, expires: Date) {
    this.username = username;
    this.token = refreshToken;
    this.expires = expires;
  }

  /**
   * Create new entry in admin_session table
   *
   * @param dbClient DB Connection Pool (MariaDB)
   * @param session AdminSession Information
   * @return {Promise<mariadb.UpsertResult>} db operation result
   */
  static async create(
    dbClient: mariadb.Pool,
    session: AdminSession
  ): Promise<mariadb.UpsertResult> {
    return await dbClient.query(
      String.prototype.concat(
        'INSERT INTO admin_session ',
        '(username, token, expires) ',
        'VALUES (?, ?, ?)'
      ),
      [session.username, session.token, session.expires]
    );
  }

  /**
   * Delete an existing entry in admin_session table by username
   *
   * @param dbClient DB Connection Pool
   * @param username username indicating the owner of session
   * @return {Promise<mariadb.UpsertResult>} db operation result
   */
  static async deleteByUsername(
    dbClient: mariadb.Pool,
    username: string
  ): Promise<mariadb.UpsertResult> {
    return await dbClient.query(
      'DELETE FROM admin_session WHERE username = ?',
      [username]
    );
  }
}
