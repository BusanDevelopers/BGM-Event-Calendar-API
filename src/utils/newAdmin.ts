/**
 * Utility to add new admin account
 * - Able to called from terminal
 *
 * Need three Command-Line Arguments (Starts from 2)
 *  2. username
 *  3. password
 *  4. name
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as mariadb from 'mariadb';
import {BinaryLike} from 'crypto';
import ServerConfig from '../ServerConfig';
import ServerConfigTemplate from '../ServerConfigTemplate';
import Admin from '../datatypes/authentication/Admin';
import checkUsernameRule from '../functions/inputValidator/checkUsernameRule';
import checkPasswordRule from '../functions/inputValidator/checkPasswordRule';

/**
 * Function to add new admin account
 *
 * @param username username of new admin
 * @param password password of new admin
 * @param name name of new admin
 * @param hashFunc hash function to hash the password
 * @param config instance of ServerConfigTemplate, containing DB connection information
 * @return Promise<mariadb.UpsertResult> DB operation result
 */
export default async function newAdmin(
  username: string,
  password: string,
  name: string,
  hashFunc: (
    id: BinaryLike,
    additionalSalt: BinaryLike,
    secretString: BinaryLike
  ) => string,
  config: ServerConfigTemplate
): Promise<mariadb.UpsertResult> {
  // Check username and password rule
  if (!checkUsernameRule(username)) {
    throw new Error('Invalid Username');
  }
  if (!checkPasswordRule(username, password)) {
    throw new Error('Invalid Password');
  }

  // Generate Admin object with hashed password
  const memberSince = new Date();
  const hashedPassword = hashFunc(
    username,
    memberSince.toISOString(),
    password
  );
  const admin = new Admin(username, hashedPassword, name, memberSince);

  // Create new admin entry on database
  const dbClient = mariadb.createPool({
    host: config.db.url,
    port: config.db.port,
    user: config.db.username,
    password: config.db.password,
    database: config.db.defaultDatabase,
    compress: true,
  });
  return await Admin.create(dbClient, admin);
}

// Check Command-Line Argument (2 for system-generated, 3 provided)
if (process.argv.length !== 5) {
  console.error(
    String.prototype.concat(
      'Incorrect number of command-line arguments provided!!\n\n',
      'Please check how to use the function and try again.\n',
      'usage: node dist/utils/newAdmin.js [username] [password] [name]'
    )
  );
  // eslint-disable-next-line no-process-exit
  process.exit(1);
}
// Parse username, password, and name / Call newAdmin()
const config = new ServerConfig();
newAdmin(
  process.argv[2],
  process.argv[3],
  process.argv[4],
  ServerConfig.hash,
  config
).then(
  // DB Operation Success
  value => {
    if (value.affectedRows !== 1) {
      console.error(
        String.prototype.concat(
          'No affectedRows!!\n\n',
          'Check query result manually!!'
        )
      );
      // eslint-disable-next-line no-process-exit
      process.exit(1);
    } else {
      console.log('Successfully add new admin account');
      // eslint-disable-next-line no-process-exit
      process.exit();
    }
  },
  // When DB Operation failed
  error => {
    console.error(error);
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  }
);
