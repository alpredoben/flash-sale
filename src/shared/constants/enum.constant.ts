export enum En_ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  UNAUTHORIZED_ERROR = 'UNAUTHORIZED_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  CONFLICT_ERROR = 'CONFLICT_ERROR',
  BAD_REQUEST_ERROR = 'BAD_REQUEST_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE_ERROR = 'SERVICE_UNAVAILABLE_ERROR',
  RATE_LIMIT_EXCEEDED_ERROR = 'RATE_LIMIT_EXCEEDED_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  INSUFFICIENT_STOCK_ERROR = 'INSUFFICIENT_STOCK_ERROR',
  RESERVATION_ERROR = 'RESERVATION_ERROR',
  TOO_MANY_REQUEST_ERROR = 'TOO_MANY_REQUEST_ERROR',
  FORBIDDEN_ERROR = 'FORBIDDEN_ERROR',
}

export enum En_ItemStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SOLD_OUT = 'sold_out',
  OUT_OF_STOCK = 'out_of_stock',
}

export enum En_ReservationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum En_UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification',
  BANNED = 'banned',
}

export enum En_RoleType {
  SYSTEM = 'system',
  CUSTOM = 'custom',
}

export enum En_PermissionCategory {
  USER = 'user',
  ROLE = 'role',
  PERMISSION = 'permission',
  ITEM = 'item',
  RESERVATION = 'reservation',
  REPORT = 'report',
  SYSTEM = 'system',
}

export enum En_PermissionAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE = 'manage', // Full access
  LIST = 'list',
  VIEW = 'view',
  APPROVE = 'approve',
  REJECT = 'reject',
  EXPORT = 'export',
  IMPORT = 'import',
}

export enum En_ReservationStatus {
  BOOKED = 'BOOKED',
}
