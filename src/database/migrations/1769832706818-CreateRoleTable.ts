import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateRoleTable1769832706818 implements MigrationInterface {
  name = 'CreateRoleTable1769832706818';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type for role type
    await queryRunner.query(`
      CREATE TYPE "role_type_enum" AS ENUM (
        'system',
        'custom'
      )
    `);

    // Create roles table
    await queryRunner.createTable(
      new Table({
        name: 'roles',
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
            length: '50',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'slug',
            type: 'varchar',
            length: '50',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'type',
            type: 'role_type_enum',
            default: "'custom'",
            isNullable: false,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
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
      'roles',
      new TableIndex({
        name: 'IDX_ROLES_NAME',
        columnNames: ['name'],
        isUnique: true,
      })
    );

    await queryRunner.createIndex(
      'roles',
      new TableIndex({
        name: 'IDX_ROLES_SLUG',
        columnNames: ['slug'],
        isUnique: true,
      })
    );

    await queryRunner.createIndex(
      'roles',
      new TableIndex({
        name: 'IDX_ROLES_TYPE',
        columnNames: ['type'],
      })
    );

    await queryRunner.createIndex(
      'roles',
      new TableIndex({
        name: 'IDX_ROLES_DELETED_AT',
        columnNames: ['deleted_at'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('roles', 'IDX_ROLES_DELETED_AT');
    await queryRunner.dropIndex('roles', 'IDX_ROLES_TYPE');
    await queryRunner.dropIndex('roles', 'IDX_ROLES_SLUG');
    await queryRunner.dropIndex('roles', 'IDX_ROLES_NAME');

    // Drop table
    await queryRunner.dropTable('roles');

    // Drop enum type
    await queryRunner.query(`DROP TYPE "role_type_enum"`);
  }
}
