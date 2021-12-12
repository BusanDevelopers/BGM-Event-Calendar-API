/**
 * Generate new Access Token (JSON Web Token)
 *
 * @author Hyecheol (Jerry) Jang
 */

import * as jwt from 'jsonwebtoken';
import AuthToken from '../../datatypes/authentication/AuthToken';

/**
 * Method to generate new accessToken
 *  - expires within 15min
 *  - using HS512 as hashing algorithm
 *  - contains username
 *
 * @param username unique username indicates the owner of this token
 * @param jwtAccessKey jwt access key secret
 * @return {string} JWT access token
 */
export default function createAccessToken(
  username: AuthToken['id'],
  jwtAccessKey: string
): string {
  const tokenContent: AuthToken = {
    id: username,
    type: 'access',
  };

  // Generate AccessToken
  return jwt.sign(tokenContent, jwtAccessKey, {
    algorithm: 'HS512',
    expiresIn: '15m',
  });
}
