/**
 * express Router middleware for Auth APIs
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as express from 'express';
import * as Cosmos from '@azure/cosmos';
import ServerConfig from '../ServerConfig';
import HTTPError from '../exceptions/HTTPError';
import AuthenticationError from '../exceptions/AuthenticationError';
import BadRequestError from '../exceptions/BadRequestError';
import Admin from '../datatypes/authentication/Admin';
import LoginCredentials from '../datatypes/authentication/LoginCredentials';
import ChangePasswordForm from '../datatypes/authentication/ChangePasswordForm';
import {validateLoginCredentials} from '../functions/inputValidator/admin/validateLoginCredentials';
import {validateChangePasswordForm} from '../functions/inputValidator/admin/validateChangePasswordForm';
import checkUsernameRule from '../functions/inputValidator/admin/checkUsernameRule';
import checkPasswordRule from '../functions/inputValidator/admin/checkPasswordRule';
import createAccessToken from '../functions/JWT/createAccessToken';
import createRefreshToken from '../functions/JWT/createRefreshToken';
import verifyRefreshToken from '../functions/JWT/verifyRefreshToken';

// Path: /auth
const authRouter = express.Router();

// POST: /auth/login
authRouter.post('/login', async (req, res, next) => {
  const dbClient: Cosmos.Database = req.app.locals.dbClient;

  try {
    // Verify user input
    const loginCredentials: LoginCredentials = req.body;
    if (!validateLoginCredentials(loginCredentials)) {
      throw new BadRequestError();
    }
    // Username & password rule check
    if (!checkUsernameRule(loginCredentials.id)) {
      throw new AuthenticationError();
    }
    if (!checkPasswordRule(loginCredentials.id, loginCredentials.password)) {
      throw new AuthenticationError();
    }

    // Retrieve User Information from DB
    let admin;
    try {
      admin = await Admin.read(dbClient, loginCredentials.id);
    } catch (e) {
      /* istanbul ignore else */
      if ((e as HTTPError).statusCode === 404) {
        throw new AuthenticationError();
      } else {
        throw e;
      }
    }

    // Check password
    const hashedPassword = ServerConfig.hash(
      admin.id,
      (admin.memberSince as Date).toISOString(),
      loginCredentials.password
    );
    if (hashedPassword !== admin.password) {
      throw new AuthenticationError();
    }

    // Create Tokens
    const accessToken = createAccessToken(
      admin.id,
      req.app.get('jwtAccessKey')
    );
    const refreshToken = await createRefreshToken(
      dbClient,
      admin.id,
      req.app.get('jwtRefreshKey')
    );

    // Response
    const cookieOption: express.CookieOptions = {
      httpOnly: true,
      maxAge: 15 * 60,
      secure: true,
      domain: 'api.calendar.busandev.com',
      path: '/',
      sameSite: 'strict',
    };
    res.cookie('X-ACCESS-TOKEN', accessToken, cookieOption);
    cookieOption.maxAge = 120 * 60;
    cookieOption.path = '/auth';
    res.cookie('X-REFRESH-TOKEN', refreshToken, cookieOption);
    res.status(200).send();
  } catch (e) {
    next(e);
  }
});

// DELETE: auth/logout
authRouter.delete('/logout', async (req, res, next) => {
  const dbClient: Cosmos.Database = req.app.locals.dbClient;

  try {
    // Verify Refresh Token
    const verifyResult = await verifyRefreshToken(
      req,
      req.app.get('jwtRefreshKey'),
      dbClient
    );
    // Retrieve Refresh Token
    let refreshToken = req.cookies['X-REFRESH-TOKEN'];
    if (verifyResult.newToken !== undefined) {
      refreshToken = verifyResult.newToken;
    }

    // Remove token from DB
    await Admin.updateRemoveSessionByToken(dbClient, refreshToken);

    // Clear Cookie & Response
    res.clearCookie('X-ACCESS-TOKEN', {httpOnly: true, maxAge: 0});
    res.clearCookie('X-REFRESH-TOKEN', {httpOnly: true, maxAge: 0});
    res.status(200).send();
  } catch (e) {
    next(e);
  }
});

// GET: /auth/renew
authRouter.get('/renew', async (req, res, next) => {
  const dbClient: Cosmos.Database = req.app.locals.dbClient;

  try {
    // Verify refresh Token
    const verifyResult = await verifyRefreshToken(
      req,
      req.app.get('jwtRefreshKey'),
      dbClient
    );
    // Refresh Token about to expire (Generated new token)
    // When no refreshToken created, the variable will be undefined
    const refreshToken = verifyResult.newToken;

    // Check admin user existence
    // When admin user entry deleted, session also removed (embedded document)

    // Create new AccessToken
    const accessToken = createAccessToken(
      verifyResult.content.id,
      req.app.get('jwtAccessKey')
    );

    // Response
    const cookieOption: express.CookieOptions = {
      httpOnly: true,
      maxAge: 120 * 60,
      secure: true,
      domain: 'api.calendar.busandev.com',
      path: '/auth',
      sameSite: 'strict',
    };
    if (refreshToken !== undefined) {
      res.cookie('X-REFRESH-TOKEN', refreshToken, cookieOption);
    }
    cookieOption.maxAge = 15 * 60;
    cookieOption.path = '/';
    res.cookie('X-ACCESS-TOKEN', accessToken, cookieOption);
    res.status(200).send();
  } catch (e) {
    next(e);
  }
});

authRouter.put('/password', async (req, res, next) => {
  const dbClient: Cosmos.Database = req.app.locals.dbClient;

  try {
    // Verify refresh Token
    const verifyResult = await verifyRefreshToken(
      req,
      req.app.get('jwtRefreshKey'),
      dbClient
    );
    // Refresh Token about to expire (Generated new token)
    // When no refreshToken created, the variable will be undefined
    const refreshToken = verifyResult.newToken;

    // Verify user input
    const changePasswordForm: ChangePasswordForm = req.body;
    if (!validateChangePasswordForm(changePasswordForm)) {
      // Write previous session data before throw error
      if (refreshToken) {
        const id = verifyResult.content.id;
        await Admin.updateSession(dbClient, id, verifyResult.oldSession);
      }
      throw new BadRequestError();
    }
    // Password Rule check for new password
    if (
      !checkPasswordRule(
        verifyResult.content.id,
        changePasswordForm.newPassword
      )
    ) {
      // Write previous session data before throw error
      if (refreshToken) {
        const id = verifyResult.content.id;
        await Admin.updateSession(dbClient, id, verifyResult.oldSession);
      }
      throw new BadRequestError();
    }

    // Check whether the current password matches or not
    const admin = await Admin.read(dbClient, verifyResult.content.id);
    const hashedCurrentPW = ServerConfig.hash(
      admin.id,
      (admin.memberSince as Date).toISOString(),
      changePasswordForm.currentPassword
    );
    if (hashedCurrentPW !== admin.password) {
      // Write previous session data before throw error
      if (refreshToken) {
        const id = verifyResult.content.id;
        await Admin.updateSession(dbClient, id, verifyResult.oldSession);
      }
      throw new BadRequestError();
    }

    // Change Password
    const hashedNewPW = ServerConfig.hash(
      admin.id,
      (admin.memberSince as Date).toISOString(),
      changePasswordForm.newPassword
    );
    await Admin.updatePassword(dbClient, verifyResult.content.id, hashedNewPW);

    // Response
    if (refreshToken) {
      const cookieOption: express.CookieOptions = {
        httpOnly: true,
        maxAge: 120 * 60,
        secure: true,
        domain: 'api.calendar.busandev.com',
        path: '/auth',
        sameSite: 'strict',
      };
      res.cookie('X-REFRESH-TOKEN', refreshToken, cookieOption);
    }
    res.status(200).send();
  } catch (e) {
    next(e);
  }
});

export default authRouter;
