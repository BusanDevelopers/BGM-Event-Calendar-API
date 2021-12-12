/**
 * Runner to execute newAdmin() function on the command-line
 *  - Generate new admin account
 *
 * Need three Command-Line Arguments (Starts from 2)
 *  2. username
 *  3. password
 *  4. name
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import ServerConfig from '../ServerConfig';
import newAdmin from '../functions/utils/newAdmin';

// Check Command-Line Argument (2 for system-generated, 3 provided)
if (process.argv.length !== 5) {
  console.error(
    String.prototype.concat(
      'Incorrect number of command-line arguments provided!!\n\n',
      'Please check how to use the function and try again.\n',
      'usage: node dist/utilsRunner/newAdmin.runner.js [username] [password] [name]'
    )
  );
  // eslint-disable-next-line no-process-exit
  process.exit(1);
}

if (!process.env.DB_ENDPOINT || !process.env.DB_KEY || !process.env.DB_ID) {
  console.log('NEED DB_ENDPOINT, DB_KEY AND DB_ID ENV VARIABLE');
  // eslint-disable-next-line no-process-exit
  process.exit(1);
}

// Parse username and Call deleteAdmin()
const config = new ServerConfig(
  process.env.DB_ENDPOINT,
  process.env.DB_KEY,
  process.env.DB_ID
);
newAdmin(
  process.argv[2],
  process.argv[3],
  process.argv[4],
  ServerConfig.hash,
  config
).then(
  // DB Operation Success
  () => {
    console.log('Successfully add new admin account');
    // eslint-disable-next-line no-process-exit
    process.exit();
  },
  // When DB Operation failed
  error => {
    console.error(error);
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  }
);
