/**
 * Define type and CRUD methods for each admin entry
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as Cosmos from '@azure/cosmos';
import LoginCredentials from '../authentication/LoginCredentials';
import NotFoundError from '../../exceptions/NotFoundError';
import HTTPError from '../../exceptions/HTTPError';

// DB Container id
const ADMIN = 'admin';

/**
 * Interface for AdminSessionDB
 */
interface AdminSessionDB {
  token: string;
  expiresAt: Date | string; // Saved as ISOString
}

/**
 * Define interface for AdminSession
 */
export interface AdminSession extends AdminSessionDB {
  id: string;
}

/**
 * Class for Admin
 */
export default class Admin implements LoginCredentials {
  id: string;
  password: string; // Hashed Password
  name: string;
  memberSince: Date | string; // Saved as ISOString
  session?: undefined | AdminSessionDB;

  /**
   * Constructor for Admin Object
   *
   * @param id unique username of the admin (Maximum 12 character)
   * @param password admin's password
   * @param name name of admin
   * @param memberSince When user signed up
   */
  constructor(id: string, password: string, name: string, memberSince: Date) {
    this.id = id;
    this.password = password;
    this.name = name;
    this.memberSince = memberSince;
  }

  /**
   * Create new entry in admin container
   *
   * @param dbClient DB Client (Cosmos Database)
   * @param admin Admin Information
   * @return {Promise<Cosmos.ItemResponse<Admin>>} db operation result
   */
  static async create(
    dbClient: Cosmos.Database,
    admin: Admin
  ): Promise<Cosmos.ItemResponse<Admin>> {
    // Generate date string
    admin.memberSince = (admin.memberSince as Date).toISOString();

    let dbOps;
    try {
      dbOps = await dbClient.container(ADMIN).items.create<Admin>(admin);
    } catch (e) {
      // Check for duplicated username
      /* istanbul ignore else */
      if ((e as Cosmos.ErrorResponse).code === 409) {
        throw new HTTPError(400, 'Duplicated Username');
      } else {
        throw e;
      }
    }

    return dbOps;
  }

  /**
   * Retrieve an Admin document from DB
   *
   * @param dbClient DB Client (Cosmos Database)
   * @param id username associated with the Admin
   * @return {Promise<Admin>} return information of Admin associated with the username
   */
  static async read(dbClient: Cosmos.Database, id: string): Promise<Admin> {
    // Query
    const queryResult = await dbClient.container(ADMIN).item(id).read<Admin>();

    // Error
    if (queryResult.statusCode === 404) {
      throw new NotFoundError();
    }
    /* istanbul ignore next */
    if (queryResult.statusCode >= 400) {
      throw new Error(JSON.stringify(queryResult));
    }

    const admin = queryResult.resource as Admin;
    admin.memberSince = new Date(admin.memberSince);
    return admin;
  }

  /**
   * Retrieve an AdminSession from DB
   *
   * @param dbClient DB Client (Cosmos Database)
   * @param refreshToken refreshToken which indicates the session
   * @return {Promise<AdminSession>} return information of AdminSession associated with the refreshToken
   */
  static async readSession(
    dbClient: Cosmos.Database,
    refreshToken: string
  ): Promise<AdminSession> {
    // Query
    const dbOps = await dbClient
      .container(ADMIN)
      .items.query<Admin>({
        query: String.prototype.concat(
          'SELECT a.id, a.session.token, a.session.expiresAt ',
          'FROM admin AS a WHERE a.session.token = @token'
        ),
        parameters: [{name: '@token', value: refreshToken}],
      })
      .fetchAll();

    // Check existence
    if (dbOps.resources.length !== 1) {
      throw new NotFoundError();
    }
    const session = dbOps.resources[0] as unknown as AdminSession;
    session.expiresAt = new Date(session.expiresAt);
    return session;
  }

  /**
   * Update password of existing document in admin container
   *
   * @param dbClient DB Client (Cosmos Database)
   * @param id username associated with the Admin
   * @param password new password (Hashed)
   * @return {Promise<Cosmos.ItemResponse<Admin>>} db operation result
   */
  static async updatePassword(
    dbClient: Cosmos.Database,
    id: string,
    password: string
  ): Promise<Cosmos.ItemResponse<Admin>> {
    // Get user document
    const admin = await Admin.read(dbClient, id);
    admin.memberSince = (admin.memberSince as Date).toISOString();

    // Update password
    admin.password = password;
    return await dbClient.container(ADMIN).item(id).replace<Admin>(admin);
  }

  /**
   * Update session of existing document in admin container
   *
   * @param dbClient DB Client (Cosmos Database)
   * @param id username associated with the Admin
   * @param adminSessionDB admin session information
   * @return {Promise<Cosmos.ItemResponse<Admin>>} db operation result
   */
  static async updateSession(
    dbClient: Cosmos.Database,
    id: string,
    adminSessionDB: AdminSessionDB | undefined
  ): Promise<Cosmos.ItemResponse<Admin>> {
    // Get user document
    const admin = await Admin.read(dbClient, id);
    admin.memberSince = (admin.memberSince as Date).toISOString();

    // Update Session
    admin.session = adminSessionDB
      ? {
          token: adminSessionDB.token,
          expiresAt: (adminSessionDB.expiresAt as Date).toISOString(),
        }
      : undefined;
    return await dbClient.container(ADMIN).item(id).replace<Admin>(admin);
  }

  /**
   * Remove session from admin document by token
   *
   * @param dbClient DB Client (Cosmos Database)
   * @param refreshToken token indicating a session
   * @return {Promise<Cosmos.ItemResponse<Admin>>} db operation result
   */
  static async updateRemoveSessionByToken(
    dbClient: Cosmos.Database,
    refreshToken: string
  ): Promise<Cosmos.ItemResponse<Admin> | void> {
    // Retrieve admin document
    const dbOps = await dbClient
      .container(ADMIN)
      .items.query<Admin>({
        query: 'SELECT * FROM admin as a WHERE a.session.token = @token',
        parameters: [{name: '@token', value: refreshToken}],
      })
      .fetchAll();
    const admin = dbOps.resources[0];

    // Update admin document
    admin.session = undefined;
    return await dbClient.container(ADMIN).item(admin.id).replace<Admin>(admin);
  }

  /**
   * Delete an existing document in admin container
   *
   * @param dbClient DB Client (Cosmos Database)
   * @param id username associated with the Admin
   * @return {Promise<Cosmos.ItemResponse<Admin>>} db operation result
   */
  static async delete(
    dbClient: Cosmos.Database,
    id: string
  ): Promise<Cosmos.ItemResponse<Admin>> {
    let dbOps;
    try {
      // Delete Query
      dbOps = await dbClient.container(ADMIN).item(id).delete<Admin>();
    } catch (e) {
      /* istanbul ignore else */
      if ((e as Cosmos.ErrorResponse).code === 404) {
        throw new NotFoundError();
      } else {
        throw e;
      }
    }

    return dbOps;
  }
}
