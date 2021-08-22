/**
 * Utility to add new admin account
 * - Able to called from terminal
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as mariadb from 'mariadb';
import {BinaryLike} from 'crypto';
import ServerConfigTemplate from '../../ServerConfigTemplate';
import Admin from '../../datatypes/authentication/Admin';
import checkUsernameRule from '../inputValidator/checkUsernameRule';
import checkPasswordRule from '../inputValidator/checkPasswordRule';

/**
 * Function to add new admin account
 *
 * @param username username of new admin
 * @param password password of new admin
 * @param name name of new admin
 * @param hashFunc hash function to hash the password
 * @param config instance of ServerConfigTemplate, containing DB connection information
 * @return Promise<mariadb.UpsertResult> DB operation result
 */
export default async function newAdmin(
  username: string,
  password: string,
  name: string,
  hashFunc: (
    id: BinaryLike,
    additionalSalt: BinaryLike,
    secretString: BinaryLike
  ) => string,
  config: ServerConfigTemplate
): Promise<mariadb.UpsertResult> {
  // Check username and password rule
  if (!checkUsernameRule(username)) {
    throw new Error('Invalid Username');
  }
  if (!checkPasswordRule(username, password)) {
    throw new Error('Invalid Password');
  }

  // Generate Admin object with hashed password
  const memberSince = new Date();
  memberSince.setMilliseconds(0);
  const hashedPassword = hashFunc(
    username,
    memberSince.toISOString(),
    password
  );
  const admin = new Admin(username, hashedPassword, name, memberSince);

  // Create new admin entry on database
  const dbClient = mariadb.createPool({
    host: config.db.url,
    port: config.db.port,
    user: config.db.username,
    password: config.db.password,
    database: config.db.defaultDatabase,
    compress: true,
  });
  let result;
  try {
    result = await Admin.create(dbClient, admin);
    await dbClient.end();
  } catch (e) {
    await dbClient.end();
    throw e;
  }
  return result;
}