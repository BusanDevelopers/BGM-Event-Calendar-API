/**
 * Generate new Refresh Token (JSON Web Token)
 *
 * @author Hyecheol (Jerry) Jang
 */

import * as jwt from 'jsonwebtoken';
import * as Cosmos from '@azure/cosmos';
import AuthToken from '../../datatypes/authentication/AuthToken';
import Admin from '../../datatypes/authentication/Admin';

/**
 * Method to generate new refreshToken
 *  - expires within 120min
 *  - using HS512 as hashing algorithm
 *  - contains username
 *  - Saved to DB admin_session table
 *    - If there exists previous session, invalidate the session
 *
 * @param dbClient DB Client (Cosmos Database)
 * @param username unique username indicates the owner of this token
 * @param jwtRefreshKey jwt Refresh Token Secret
 * @return {Promise<string>} JWT refresh Token
 */
export default async function createRefreshToken(
  dbClient: Cosmos.Database,
  username: AuthToken['id'],
  jwtRefreshKey: string
): Promise<string> {
  // Token content
  const tokenContent: AuthToken = {
    id: username,
    type: 'refresh',
  };

  // Database - delete existing refreshTokens
  await Admin.updateSession(dbClient, username, undefined);

  // Generate RefreshToken
  const refreshToken = jwt.sign(tokenContent, jwtRefreshKey, {
    algorithm: 'HS512',
    expiresIn: '120m',
  });

  // Database - Add new refresh token
  const expDate = new Date();
  expDate.setMinutes(expDate.getMinutes() + 120);
  const session = {token: refreshToken, expiresAt: expDate};
  await Admin.updateSession(dbClient, username, session);

  return refreshToken;
}
