/**
 * Utility to add new admin account
 * - Able to called from terminal
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as Cosmos from '@azure/cosmos';
import {BinaryLike} from 'crypto';
import ServerConfigTemplate from '../../ServerConfigTemplate';
import Admin from '../../datatypes/authentication/Admin';
import checkUsernameRule from '../inputValidator/admin/checkUsernameRule';
import checkPasswordRule from '../inputValidator/admin/checkPasswordRule';

/**
 * Function to add new admin account
 *
 * @param id username of new admin
 * @param password password of new admin
 * @param name name of new admin
 * @param hashFunc hash function to hash the password
 * @param config instance of ServerConfigTemplate, containing DB connection information
 * @return Promise<Cosmos.ItemResponse<Admin>> DB operation result
 */
export default async function newAdmin(
  id: string,
  password: string,
  name: string,
  hashFunc: (
    id: BinaryLike,
    additionalSalt: BinaryLike,
    secretString: BinaryLike
  ) => string,
  config: ServerConfigTemplate
): Promise<Cosmos.ItemResponse<Admin>> {
  // Check username and password rule
  if (!checkUsernameRule(id)) {
    throw new Error('Invalid Username');
  }
  if (!checkPasswordRule(id, password)) {
    throw new Error('Invalid Password');
  }

  // Generate Admin object with hashed password
  const memberSince = new Date();
  memberSince.setMilliseconds(0);
  const hashedPassword = hashFunc(id, memberSince.toISOString(), password);
  const admin = new Admin(id, hashedPassword, name, memberSince);

  // Create new admin entry on database
  const dbClient = new Cosmos.CosmosClient({
    endpoint: config.db.endpoint,
    key: config.db.key,
  }).database(config.db.databaseId);
  return await Admin.create(dbClient, admin);
}
