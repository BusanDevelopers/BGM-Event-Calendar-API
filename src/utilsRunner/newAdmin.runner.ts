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
