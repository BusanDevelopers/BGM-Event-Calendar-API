/**
 * Define types for the objects related with configuring the server
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

/**
 * Interface to define ConfigObj object
 * This type of object will given to the constructor of ServerConfig
 */
export interface ConfigObj {
  db: DbObj; // contain database configuration parameters
  expressPort: number; // indicate express server port
  jwtKeys: JwtKeyObj; // indicate jwt token credentials
}

/**
 * Interface to define DbObj object
 * This type of object should be contained in the ConfigObj
 */
export interface DbObj {
  endpoint: string; // URL indicating the location of database server and port
  key: string;
  databaseId: string; // default database name
}

/**
 * Interface to define jwtKeyObj object
 * This type of object should be contained in the ConfigObj
 */
export interface JwtKeyObj {
  secretKey: string; // key that used to validate the token
  refreshKey: string; // different key that used to  validate refresh token
}
