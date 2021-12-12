/**
 * Making sessions to be expired earlier
 *
 * @author Hyecheol (Jerry) Jang
 */

import * as Cosmos from '@azure/cosmos';

// DB Collection ID
const ADMIN = 'admin';

/**
 * Method to make sessions be expired earlier
 *
 * @param dbClient {Cosmos.Database} DB Client (Cosmos Database)
 * @param min {number} How many minutes the token be expired earlier
 * @return {number} Number of affected sessions
 */
export default async function invalidateToken(
  dbClient: Cosmos.Database,
  min: number
): Promise<number> {
  // Get Admin with refresh token
  const dbOps = await dbClient
    .container(ADMIN)
    .items.query('SELECT * FROM admin AS a WHERE a.session.token != null')
    .fetchAll();
  if (dbOps.resources.length === 0) {
    return 0;
  }

  // Update session
  let counter = 0;
  for (let index = 0; index < dbOps.resources.length; ++index) {
    // Generate new ISOString for the session
    // passed x min is same as token expires x min earlier
    const admin = dbOps.resources[index];
    const expiresAt = new Date(admin.session.expiresAt);
    expiresAt.setMinutes(expiresAt.getMinutes() - min);
    admin.session.expiresAt = expiresAt.toISOString();

    // DB Operation
    const dbUpdate = await dbClient
      .container(ADMIN)
      .item(admin.id)
      .replace(admin);

    /* istanbul ignore else */
    if (dbUpdate.statusCode < 400) {
      counter += 1;
    } else {
      throw new Error('Session Update Error');
    }
  }
  return counter;
}
