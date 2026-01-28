export const SYSTEM_ROLES = {
  SUPER_ADMIN: 'superadmin',
  ADMIN: 'admin',
  USER: 'user',
} as const;

export const PERMISSION_RESOURCES = {
  USERS: 'users',
  ROLES: 'roles',
  PERMISSIONS: 'permissions',
  ITEMS: 'items',
  RESERVATIONS: 'reservations',
  REPORTS: 'reports',
  SYSTEM: 'system',
} as const;
