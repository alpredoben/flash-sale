import apiResponse from '@utils/response.util';
import { validationResult, ValidationChain } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import lang from '@lang/index';
class ValidationMiddleware {
  private static instance: ValidationMiddleware;

  private constructor() {}

  public static getInstance(): ValidationMiddleware {
    if (!ValidationMiddleware.instance) {
      ValidationMiddleware.instance = new ValidationMiddleware();
    }
    return ValidationMiddleware.instance;
  }

  /** Validate request using express-validator chains */
  validate = (validations: ValidationChain[]) => {
    return async (
      req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      for (const validation of validations) {
        await validation.run(req);
      }

      // check for errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const formattedErrors = errors
          .array()
          .reduce((acc: any, error: any) => {
            const field = error.path || error.param;
            if (!acc[field]) {
              acc[field] = [];
            }
            acc[field].push(error.msg);
            return acc;
          }, {});

        apiResponse.sendBadRequest(
          res,
          lang.__('error.validation.data'),
          formattedErrors
        );
        return;
      }

      next();
    };
  };

  sanitize = (req: Request, res: Response, next: NextFunction): void => {
    if (req.body && typeof req.body === 'object') {
      // Remove any fields that start with $ or contain dots (MongoDB injection prevention)
      const sanitized = this.sanitizeObject(req.body);
      req.body = sanitized;
    }
    next();
  };

  /* Recursively sanitize object */
  private sanitizeObject(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item));
    }

    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        // Skip keys that start with $ or contain dots
        if (!key.startsWith('$') && !key.includes('.')) {
          sanitized[key] = this.sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }
    return obj;
  }

  /**
   * @param validations - Express validator validation chains
   * @returns Array of middlewares to be used in routes
   *
   * @example
   * router.post('/[path]',
   *   ...validateRequest(validator.register()),
   *   controller.[function]
   * );
   */
  validateRequest = (validations: ValidationChain[]) => {
    return [
      this.sanitize,
      ...validations,
      this.validate(validations),
    ];
  };
}

export default ValidationMiddleware.getInstance();
