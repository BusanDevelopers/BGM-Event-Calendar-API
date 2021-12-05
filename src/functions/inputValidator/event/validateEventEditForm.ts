/**
 * Validate user input - Event Edit Form
 *
 * @author Hyecheol (Jerry) Jang <hyecheo123@gmail.com>
 */

import Ajv from 'ajv';

export const validateEventEditForm = new Ajv().compile({
  type: 'object',
  properties: {
    year: {type: 'number', minimum: 2021},
    month: {type: 'number', minimum: 1, maximum: 12},
    date: {type: 'number', minimum: 1, maximum: 31},
    name: {type: 'string'},
    detail: {type: 'string'},
    category: {type: 'string'},
  },
  additionalProperties: false,
});
