export enum En_RoleName {
  ADMIN = 'admin',
  USER = 'user'
}

export enum En_ItemStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SOLD_OUT = 'sold_out',
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
