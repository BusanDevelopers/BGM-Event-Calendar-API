/**
 * Utility to add new admin account
 * - Able to called from terminal
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as mariadb from 'mariadb';
import {BinaryLike} from 'crypto';
import ServerConfigTemplate from '../ServerConfigTemplate';
import Admin from '../datatypes/authentication/Admin';

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
  // Generate Admin object with hashed password
  const memberSince = new Date();
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
  return await Admin.create(dbClient, admin);
}

// TODO: CLA to parse username, password, and name
