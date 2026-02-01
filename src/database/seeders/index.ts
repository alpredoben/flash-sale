// src/database/seeders/main.seeder.ts
import { createConnection } from 'typeorm';
import { PermissionSeeder } from './permission.seeder';
import { RoleSeeder } from './role.seeder';
import { UserSeeder } from './user.seeder';
import { AppDataSource } from '../../configs/database.config';

const runSeeder = async () => {
  try {
    console.log('⚪ Connecting to database...');
    await AppDataSource.initialize();

    await PermissionSeeder(AppDataSource);
    await RoleSeeder(AppDataSource);
    await UserSeeder(AppDataSource);

    console.log('✅ All seeders completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

runSeeder();
