/**
 * Validate user input - login credentials
 *
 * @author Hyecheol (Jerry) Jang <hyecheo123@gmail.com>
 */

import Ajv from 'ajv';

export const validateLoginCredentials = new Ajv().compile({
  type: 'object',
  properties: {
    id: {type: 'string'},
    password: {type: 'string'},
  },
  required: ['id', 'password'],
  additionalProperties: false,
});
