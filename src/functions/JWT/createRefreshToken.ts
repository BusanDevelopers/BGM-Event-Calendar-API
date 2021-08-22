/**
 * Generate new Refresh Token (JSON Web Token)
 *
 * @author Hyecheol (Jerry) Jang
 */

import * as jwt from 'jsonwebtoken';
import * as mariadb from 'mariadb';
import AuthToken from '../../datatypes/authentication/AuthToken';
import AdminSession from '../../datatypes/authentication/AdminSession';

/**
 * Method to generate new refreshToken
 *  - expires within 120min
 *  - using HS512 as hashing algorithm
 *  - contains username
 *  - Saved to DB admin_session table
 *    - If there exists previous session, invalidate the session
 *
 * @param dbClient DB Connection Pool (MariaDB)
 * @param username unique username indicates the owner of this token
 * @param jwtRefreshKey jwt Refresh Token Secret
 * @return {Promise<string>} JWT refresh Token
 */
export default async function createRefreshToken(
  dbClient: mariadb.Pool,
  username: AuthToken['username'],
  jwtRefreshKey: string
): Promise<string> {
  // Token content
  const tokenContent: AuthToken = {
    username: username,
    type: 'refresh',
  };

  // Database - delete existing refreshTokens
  await AdminSession.deleteByUsername(dbClient, username);

  // Generate RefreshToken
  const refreshToken = jwt.sign(tokenContent, jwtRefreshKey, {
    algorithm: 'HS512',
    expiresIn: '120m',
  });

  // Database - Add new refresh token
  const expDate = new Date();
  expDate.setMinutes(expDate.getMinutes() + 120);
  const session = {username: username, token: refreshToken, expires: expDate};
  await AdminSession.create(dbClient, session);

  return refreshToken;
}
