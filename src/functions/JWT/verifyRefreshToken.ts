/**
 * Verifying Refresh Token (JSON Web Token)
 *
 * @author Hyecheol (Jerry) Jang
 */

import {Request} from 'express';
import * as mariadb from 'mariadb';
import * as jwt from 'jsonwebtoken';
import AdminSession from '../../datatypes/authentication/AdminSession';
import AuthToken from '../../datatypes/authentication/AuthToken';
import JWTObject from '../../datatypes/authentication/JWTObject';
import RefreshTokenVerifyResult from '../../datatypes/authentication/RefreshTokenVerifyResult';
import AuthenticationError from '../../exceptions/AuthenticationError';
import createRefreshToken from './createRefreshToken';

/**
 * Method to verify refreshToken
 *
 * @param req Express Request object
 * @param jwtRefreshKey JWT Refresh Token secret
 * @param dbClient DB Connection Pool
 * @return {Promise<RefreshTokenVerifyResult>} verification result of refresh token
 *   (new token included if the refresh token is about to expire)
 */
export default async function verifyRefreshToken(
  req: Request,
  jwtRefreshKey: string,
  dbClient: mariadb.Pool
): Promise<RefreshTokenVerifyResult> {
  if (!('X-REFRESH-TOKEN' in req.cookies)) {
    throw new AuthenticationError();
  }
  let tokenContents: JWTObject; // place to store contents of JWT
  // Verify and retrieve the token contents
  try {
    tokenContents = jwt.verify(req.cookies['X-REFRESH-TOKEN'], jwtRefreshKey, {
      algorithms: ['HS512'],
    }) as JWTObject;
  } catch (e) {
    throw new AuthenticationError();
  }
  if (tokenContents.type !== 'refresh') {
    throw new AuthenticationError();
  }

  // Check token in DB
  try {
    const dbToken = await AdminSession.read(
      dbClient,
      req.cookies['X-REFRESH-TOKEN']
    );
    /* istanbul ignore if */
    if (dbToken.expires < new Date()) {
      throw new AuthenticationError();
    }
  } catch (e) {
    /* istanbul ignore else */
    if (e.message === 'Not Found') {
      throw new AuthenticationError();
    } else {
      throw e;
    }
  }

  // If RefreshToken expires within 20min, create new refresh token and delete previous one
  const expectedExpire = new Date();
  expectedExpire.setMinutes(new Date().getMinutes() + 20);
  let newRefreshToken;
  if (new Date((tokenContents.exp as number) * 1000) < expectedExpire) {
    // Less than 20 min remaining
    newRefreshToken = await createRefreshToken(
      dbClient,
      tokenContents.username,
      jwtRefreshKey
    );
  }

  delete tokenContents.iat;
  delete tokenContents.exp;
  return {content: tokenContents as AuthToken, newToken: newRefreshToken};
}
