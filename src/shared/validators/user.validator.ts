import { param, ValidationChain } from 'express-validator';
import lang from '@lang/index';

class UserValidator {
  private static instance: UserValidator;

  private constructor() {}

  public static getInstance(): UserValidator {
    if (!UserValidator.instance) {
      UserValidator.instance = new UserValidator();
    }
    return UserValidator.instance;
  }

  /** Validation for get User */
  getUser(): ValidationChain[] {
    return [
      param('id')
        .notEmpty()
        .withMessage(lang.__('error.validation.required', { field: `ID` })),
    ];
  }
}

export default UserValidator.getInstance();
