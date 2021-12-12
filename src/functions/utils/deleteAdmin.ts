/**
 * Utility to delete existing admin account
 * - Able to called from terminal
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as Cosmos from '@azure/cosmos';
import ServerConfigTemplate from '../../ServerConfigTemplate';
import Admin from '../../datatypes/authentication/Admin';

/**
 * Function to delete existing admin account
 *
 * @param id username of delete target
 * @param config instance of ServerConfigTemplate, containing DB connection information
 * @return Promise<Cosmos.ItemResponse<Admin>> DB operation result
 */
export default async function deleteAdmin(
  id: string,
  config: ServerConfigTemplate
): Promise<Cosmos.ItemResponse<Admin>> {
  // Create new admin entry on database
  const dbClient = new Cosmos.CosmosClient({
    endpoint: config.db.endpoint,
    key: config.db.key,
  }).database(config.db.databaseId);
  return await Admin.delete(dbClient, id);
}
