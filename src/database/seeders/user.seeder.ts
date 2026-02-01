// src/database/seeders/user.seeder.ts
import { DataSource } from 'typeorm';
import { User } from '../models/user.model';
import { Role } from '../models/role.model';
import { En_UserStatus } from '../../shared/constants/enum.constant';
import * as bcrypt from 'bcrypt';

export const UserSeeder = async (dataSource: DataSource) => {
  const userRepo = dataSource.getRepository(User);
  const roleRepo = dataSource.getRepository(Role);

  console.log('📦 Seeding Users...');
  const adminRole = await roleRepo.findOneBy({ slug: 'superadmin' });
  const hashedPassword = await bcrypt.hash('password123', 10);

  // {
  //   "email": "admin@example.com",
  //   "password": "password123"
  // }

  const adminExist = await userRepo.findOneBy({ email: 'admin@example.com' });
  if (!adminExist) {
    const admin = userRepo.create({
      firstName: 'Super',
      lastName: 'Admin',
      email: 'admin@example.com',
      password: hashedPassword,
      status: En_UserStatus.ACTIVE,
      emailVerified: true,
      roles: adminRole ? [adminRole] : [],
    });
    await userRepo.save(admin);
  }
  console.log('✅ Users seeded!');
};
