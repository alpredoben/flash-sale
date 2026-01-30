import logger from '@utils/logger.util';
import { En_ErrorCode } from '../constants/enum.constant';
import { ValidationError as ClassValidationError } from 'class-validator';
import { Request, Response, NextFunction } from 'express';
import { QueryFailedError } from 'typeorm';
import environment from '@config/env.config';
import apiResponse from '@utils/response.util';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;
  public details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    code?: string,
    details?: any
  ) {
    super(message);

    // Set the prototype explicitly for proper instanceof checks
    Object.setPrototypeOf(this, AppError.prototype);

    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    this.details = details;

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);

    // Log error
    logger.error('AppError created', {
      message: this.message,
      statusCode: this.statusCode,
      code: this.code,
      stack: this.stack,
      details: this.details,
    });
  }
}

/** Bad Request Error */
export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request', details?: any) {
    super(message, 400, true, En_ErrorCode.BAD_REQUEST_ERROR, details);
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}

/** Unauthorized error */

/** Authentication Error */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication failed. (Unauthorized)') {
    super(message, 401, true, En_ErrorCode.AUTHENTICATION_ERROR);
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/** Forbidden */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, false, En_ErrorCode.FORBIDDEN_ERROR);
  }
}

/** Not Found Error */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, true, En_ErrorCode.NOT_FOUND_ERROR);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/** Conflict Error (e.g., duplicate entry) */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict', details?: any) {
    super(message, 409, true, En_ErrorCode.CONFLICT_ERROR, details);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/** Validation Error */
export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: any) {
    super(message, 422, true, En_ErrorCode.VALIDATION_ERROR, details);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/** Too Many Request */
export class TooManyRequestsError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, false, En_ErrorCode.TOO_MANY_REQUEST_ERROR);
  }
}

/** Internal Server Error */
export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error', details?: any) {
    super(message, 500, false, En_ErrorCode.INTERNAL_SERVER_ERROR, details);
    Object.setPrototypeOf(this, InternalServerError.prototype);
  }
}

/** Service Unavailable Error */
export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service temporarily unavailable') {
    super(message, 503, true, En_ErrorCode.SERVICE_UNAVAILABLE_ERROR);
    Object.setPrototypeOf(this, ServiceUnavailableError.prototype);
  }
}

/** Authorization Error */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, true, En_ErrorCode.AUTHORIZATION_ERROR);
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

/** Rate Limit Error */
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests', retryAfter?: number) {
    super(message, 429, true, En_ErrorCode.RATE_LIMIT_EXCEEDED_ERROR, {
      retryAfter,
    });
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/** Database Error */
export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed', details?: any) {
    super(message, 500, false, En_ErrorCode.DATABASE_ERROR, details);
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

/** External Service Error */
export class ExternalServiceError extends AppError {
  constructor(
    message: string = 'External service error',
    serviceName?: string
  ) {
    super(message, 502, true, En_ErrorCode.EXTERNAL_SERVICE_ERROR, {
      serviceName,
    });
    Object.setPrototypeOf(this, ExternalServiceError.prototype);
  }
}

/** Stock Error (specific to flash sale) */
export class StockError extends AppError {
  constructor(message: string = 'Insufficient stock available', details?: any) {
    super(message, 409, true, En_ErrorCode.INSUFFICIENT_STOCK_ERROR, details);
    Object.setPrototypeOf(this, StockError.prototype);
  }
}

/**  Reservation Error */
export class ReservationError extends AppError {
  constructor(message: string = 'Reservation error', details?: any) {
    super(message, 400, true, En_ErrorCode.RESERVATION_ERROR, details);
    Object.setPrototypeOf(this, ReservationError.prototype);
  }
}

/** Error Handler Utility */
export class ErrorHandler {
  private static instance: ErrorHandler;

  private constructor() {}

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Check if error is operational (known error)
   */
  public static isOperationalError(error: Error): boolean {
    if (error instanceof AppError) {
      return error.isOperational;
    }
    return false;
  }

  /**
   * Log error with appropriate level
   */
  private logError(
    error: Error | AppError,
    req: Request,
    statusCode: number
  ): void {
    const logData = {
      message: error.message,
      statusCode,
      path: req.path,
      method: req.method,
      ip: req.ip,
      userId: req.user?.id,
      stack: error.stack,
    };

    if (statusCode >= 500) {
      logger.error('Server error', logData);
    } else if (statusCode >= 400) {
      logger.warn('Client error', logData);
    } else {
      logger.info('Error handled', logData);
    }
  }

  /**
   * Format class-validator errors
   */
  private formatValidationErrors(
    errors: ClassValidationError[]
  ): Record<string, string[]> {
    const formatted: Record<string, string[]> = {};

    errors.forEach((error) => {
      if (error.constraints) {
        formatted[error.property] = Object.values(error.constraints);
      }

      // Handle nested validation errors
      if (error.children && error.children.length > 0) {
        const childErrors = this.formatValidationErrors(error.children);
        Object.keys(childErrors).forEach((key) => {
          const childValue = childErrors[key];
          if (childValue !== undefined) {
            formatted[`${error.property}.${key}`] = childValue;
          }
        });
      }
    });

    return formatted;
  }

  /**
   * Extract conflict field from PostgreSQL error detail
   */
  private extractConflictField(detail: string): string {
    if (!detail) return 'Unknown field';

    const match = detail.match(/Key \(([^)]+)\)/);
    return match ? match[1]! : 'Unknown field';
  }

  /**
   * Handle database errors
   */
  private handleDatabaseError(error: QueryFailedError): {
    statusCode: number;
    message: string;
    errors?: any;
  } {
    const driverError = error.driverError as any;

    // PostgreSQL error codes
    switch (driverError.code) {
      case '23505': // Unique violation
        return {
          statusCode: 409,
          message: 'Resource already exists',
          errors: { conflict: this.extractConflictField(driverError.detail) },
        };

      case '23503': // Foreign key violation
        return {
          statusCode: 400,
          message: 'Referenced resource does not exist',
          errors: { foreignKey: 'Invalid reference' },
        };

      case '23502': // Not null violation
        return {
          statusCode: 400,
          message: 'Required field is missing',
          errors: { required: driverError.column },
        };

      case '22P02': // Invalid text representation
        return {
          statusCode: 400,
          message: 'Invalid data format',
          errors: { format: 'Invalid value provided' },
        };

      case '42P01': // Undefined table
        return {
          statusCode: 500,
          message: 'Database configuration error',
        };

      default:
        logger.error('Unhandled database error', {
          code: driverError.code,
          message: driverError.message,
        });

        return {
          statusCode: 500,
          message: environment.isProduction()
            ? 'Database error occurred'
            : driverError.message,
        };
    }
  }

  /**
   * Get Multer error message
   */
  private getMulterErrorMessage(error: any): string {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return 'File size exceeds the maximum allowed limit';
      case 'LIMIT_FILE_COUNT':
        return 'Too many files uploaded';
      case 'LIMIT_UNEXPECTED_FILE':
        return 'Unexpected field in file upload';
      default:
        return 'File upload error';
    }
  }

  public handle = (
    error: Error | AppError,
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    let statusCode = 500;
    let message = 'Internal server error';
    let errors: any = undefined;

    // Handle custom AppError
    if (error instanceof AppError) {
      statusCode = error.statusCode;
      message = error.message;

      if (error instanceof ValidationError) {
        errors = error.details;
      }
    }
    // Handle class-validator validation errors
    else if (Array.isArray(error) && error[0] instanceof ClassValidationError) {
      statusCode = 422;
      message = 'Validation failed';
      errors = this.formatValidationErrors(error as ClassValidationError[]);
    }
    // Handle TypeORM query errors
    else if (error instanceof QueryFailedError) {
      const result = this.handleDatabaseError(error);
      statusCode = result.statusCode;
      message = result.message;
      errors = result.errors;
    }
    // Handle JWT errors
    else if (error.name === 'JsonWebTokenError') {
      statusCode = 401;
      message = 'Invalid token';
    } else if (error.name === 'TokenExpiredError') {
      statusCode = 401;
      message = 'Token expired';
    }
    // Handle Multer errors (file upload)
    else if (error.name === 'MulterError') {
      statusCode = 400;
      message = this.getMulterErrorMessage(error);
    }
    // Handle generic errors
    else {
      message = error.message || 'Internal server error';
    }

    // Log error
    this.logError(error, req, statusCode);

    // Send error response
    const errorResponse = {
      message,
      errors,
      meta: {
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method,
      },
    };

    // Include stack trace in development
    if (environment.isDevelopment() && error.stack) {
      (errorResponse as any).stack = error.stack;
    }

    apiResponse.sendError(res, statusCode, message, errors, errorResponse.meta);
  };

  /**
   * Handle error based on type
   */
  public static handleError(error: Error): void {
    if (this.isOperationalError(error)) {
      logger.warn('Operational error occurred', {
        message: error.message,
        stack: error.stack,
      });
    } else {
      logger.error('Non-operational error occurred', {
        message: error.message,
        stack: error.stack,
      });
    }
  }

  /**
   * Convert unknown errors to AppError
   */
  public static normalizeError(error: unknown): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      return new AppError(error.message, 500, false);
    }

    if (typeof error === 'string') {
      return new AppError(error, 500, false);
    }

    return new AppError('An unknown error occurred', 500, false);
  }

  /**
   * Handle async errors in Express routes
   */
  public static catchAsync(fn: Function) {
    return (req: any, res: any, next: any) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }
}

/** Async error wrapper for route handlers */
export const asyncHandler = (fn: Function) => {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/** Create error response object */
export const createErrorResponse = (error: AppError) => {
  return {
    success: false,
    message: error.message,
    code: error.code,
    statusCode: error.statusCode,
    details: error.details,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  };
};

const errorHandling = ErrorHandler.getInstance();

// Export default error handler
export default errorHandling;
