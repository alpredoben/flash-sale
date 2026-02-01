import { DataSource } from 'typeorm';
import { En_RoleType } from '../../shared/constants/enum.constant';
import { SYSTEM_ROLES } from '../../shared/constants/global.constant';
import { Permission } from '../models/permission.model';
import { Role } from '../models/role.model';

const ROLES_DATA_DEFINITIONS = [
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

export const RoleSeeder = async (dataSource: DataSource) => {
  const roleRepo = dataSource.getRepository(Role);
  const permRepo = dataSource.getRepository(Permission);

  console.log('📦 Seeding Roles...');
  const allPermissions = await permRepo.find();

  for (const data of ROLES_DATA_DEFINITIONS) {
    let role = await roleRepo.findOneBy({ slug: data.slug });

    if (!role) {
      role = roleRepo.create(data);
    }

    // Set all permission to superadmin
    if (data.slug === 'superadmin') {
      role.permissions = allPermissions;
    }
    // Set current permission to user
    else if (data.slug === 'user') {
      role.permissions = allPermissions.filter((p: any) =>
        ['items_read', 'reservations_create', 'reservations_read'].includes(
          p.slug
        )
      );
    }

    await roleRepo.save(role);
  }
  console.log('✅ Roles seeded!');
};
