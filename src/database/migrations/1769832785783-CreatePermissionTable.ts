import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreatePermissionTable1769832785783 implements MigrationInterface {
  name = 'CreatePermissionsTable1706659400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type for permission category
    await queryRunner.query(`
      CREATE TYPE "permission_category_enum" AS ENUM (
        'user',
        'role',
        'permission',
        'item',
        'reservation',
        'report',
        'system'
      )
    `);

    // Create enum type for permission action
    await queryRunner.query(`
      CREATE TYPE "permission_action_enum" AS ENUM (
        'create',
        'read',
        'update',
        'delete',
        'manage',
        'list',
        'view',
        'approve',
        'reject',
        'export',
        'import'
      )
    `);

    // Create permissions table
    await queryRunner.createTable(
      new Table({
        name: 'permissions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'slug',
            type: 'varchar',
            length: '100',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'category',
            type: 'permission_category_enum',
            isNullable: false,
          },
          {
            name: 'resource',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'action',
            type: 'permission_action_enum',
            isNullable: false,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'is_system',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'updated_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'deleted_by',
            type: 'uuid',
            isNullable: true,
          },
        ],
      }),
      true
    );

    // Create indexes
    await queryRunner.createIndex(
      'permissions',
      new TableIndex({
        name: 'IDX_PERMISSIONS_NAME',
        columnNames: ['name'],
        isUnique: true,
      })
    );

    await queryRunner.createIndex(
      'permissions',
      new TableIndex({
        name: 'IDX_PERMISSIONS_SLUG',
        columnNames: ['slug'],
        isUnique: true,
      })
    );

    await queryRunner.createIndex(
      'permissions',
      new TableIndex({
        name: 'IDX_PERMISSIONS_CATEGORY',
        columnNames: ['category'],
      })
    );

    await queryRunner.createIndex(
      'permissions',
      new TableIndex({
        name: 'IDX_PERMISSIONS_RESOURCE',
        columnNames: ['resource'],
      })
    );

    await queryRunner.createIndex(
      'permissions',
      new TableIndex({
        name: 'IDX_PERMISSIONS_DELETED_AT',
        columnNames: ['deleted_at'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('permissions', 'IDX_PERMISSIONS_DELETED_AT');
    await queryRunner.dropIndex('permissions', 'IDX_PERMISSIONS_RESOURCE');
    await queryRunner.dropIndex('permissions', 'IDX_PERMISSIONS_CATEGORY');
    await queryRunner.dropIndex('permissions', 'IDX_PERMISSIONS_SLUG');
    await queryRunner.dropIndex('permissions', 'IDX_PERMISSIONS_NAME');

    // Drop table
    await queryRunner.dropTable('permissions');

    // Drop enum types
    await queryRunner.query(`DROP TYPE "permission_action_enum"`);
    await queryRunner.query(`DROP TYPE "permission_category_enum"`);
  }
}
