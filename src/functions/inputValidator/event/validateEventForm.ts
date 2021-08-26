/**
 * Validate user input - Event Form
 *
 * @author Hyecheol (Jerry) Jang <hyecheo123@gmail.com>
 */

import Ajv from 'ajv';

export const validateEventForm = new Ajv().compile({
  type: 'object',
  properties: {
    year: {type: 'number', minimum: 2021},
    month: {type: 'number', minimum: 1, maximum: 12},
    date: {type: 'number', minimum: 1, maximum: 31},
    name: {type: 'string'},
    detail: {type: 'string'},
    category: {type: 'string'},
  },
  required: ['year', 'month', 'date', 'name'],
  additionalProperties: false,
});
