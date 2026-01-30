import { body, check, param } from 'express-validator';
import lang from '@lang/index';

export const reqValidation = (
  property: string,
  required: string,
  type: string = 'body',
  optional: boolean = false
) => {
  let validation = body(property).trim();

  if (type == 'check') {
    validation = check(property).trim();
  }

  if (type == 'param') {
    param(property);
  }

  if (optional === true) {
    return validation.optional(optional);
  }

  return validation
    .notEmpty()
    .withMessage(
      lang.__('error.validation.required', { field: `${required}` })
    );
};
