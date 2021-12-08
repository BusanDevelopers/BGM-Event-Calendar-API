/**
 * Validate user input - Participation Form
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';

export const validateParticipationForm = addFormats(new Ajv()).compile({
  type: 'object',
  properties: {
    participantName: {type: 'string'},
    email: {type: 'string', format: 'email'},
    phoneNumber: {type: 'string', pattern: '^010[0-9]{8}$'},
    comment: {type: 'string'},
  },
  required: ['participantName', 'email'],
  additionalProperties: false,
});
