/**
 * Utility to delete existing admin account
 * - Able to called from terminal
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as mariadb from 'mariadb';
import ServerConfigTemplate from '../../ServerConfigTemplate';
import Admin from '../../datatypes/authentication/Admin';

/**
 * Function to delete existing admin account
 *
 * @param username username of delete target
 * @param config instance of ServerConfigTemplate, containing DB connection information
 */
export default async function deleteAdmin(
  username: string,
  config: ServerConfigTemplate
): Promise<mariadb.UpsertResult> {
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
    result = await Admin.delete(dbClient, username);
    await dbClient.end();
  } catch (e) {
    await dbClient.end();
    throw e;
  }
  return result;
}
