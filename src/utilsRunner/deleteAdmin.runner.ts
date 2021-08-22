/**
 * Runner to execute deleteAdmin() function on the command-line
 *  - Delete an exsiting admin account
 *
 * Need one Command-Line Arguments (Starts from 2)
 *  2. username
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import ServerConfig from '../ServerConfig';
import deleteAdmin from '../functions/utils/deleteAdmin';

// Check Command-Line Argument (2 for system-generated, 1 provided)
if (process.argv.length !== 3) {
  console.error(
    String.prototype.concat(
      'Incorrect number of command-line arguments provided!!\n\n',
      'Please check how to use the function and try again.\n',
      'usage: node dist/utilsRunner/deleteAdmin.runner.js [username] [password] [name]'
    )
  );
  // eslint-disable-next-line no-process-exit
  process.exit(1);
}

// Parse username and Call deleteAdmin()
const config = new ServerConfig();
deleteAdmin(process.argv[2], config).then(
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
      console.log('Successfully deleted existing admin account');
      // eslint-disable-next-line no-process-exit
      process.exit();
    }
  },
  // DB Operation Fail
  error => {
    console.error(error);
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  }
);
