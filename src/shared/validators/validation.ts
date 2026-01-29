import { body, check } from 'express-validator';
import lang from '@lang/index';

export const reqValidation = (
  property: string,
  required: string,
  type: string = 'body',
  optional: boolean = false
) => {
  const validation = type === 'body' ? body(property) : check(property);
  if (optional === true) {
    return validation.optional(optional);
  }

  return validation
    .trim()
    .notEmpty()
    .withMessage(
      lang.__('error.validation.required', { field: `${required}` })
    );
};
