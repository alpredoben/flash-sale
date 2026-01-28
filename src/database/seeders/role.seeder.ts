import { En_RoleType } from '@constants/enum.constant';
import { SYSTEM_ROLES } from '@constants/global.constant';

export const ROLES_DATA_DEFINITIONS = [
  {
    name: 'Super Admin',
    slug: SYSTEM_ROLES.SUPER_ADMIN,
    description: 'Full system access with all permissions',
    type: En_RoleType.SYSTEM,
    isActive: true,
  },
  {
    name: 'Admin',
    slug: SYSTEM_ROLES.ADMIN,
    description:
      'Administrative access to manage users, items, and reservations',
    type: En_RoleType.SYSTEM,
    isActive: true,
  },
  {
    name: 'User',
    slug: SYSTEM_ROLES.USER,
    description: 'Standard user access to make reservations',
    type: En_RoleType.SYSTEM,
    isActive: true,
  },
];
