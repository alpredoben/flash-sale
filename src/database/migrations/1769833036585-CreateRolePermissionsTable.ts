import { TableNames } from '../../shared/constants/tableName.constant';
import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class CreateRolePermissionsTable1769833036585 implements MigrationInterface {
  name = 'CreateRolePermissionsTable1769833036585';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create role_permissions junction table
    await queryRunner.createTable(
      new Table({
        name: TableNames.RolePermissions,
        columns: [
          {
            name: 'role_id',
            type: 'uuid',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'permission_id',
            type: 'uuid',
            isPrimary: true,
            isNullable: false,
          },
        ],
      }),
      true
    );

    // Create indexes
    await queryRunner.createIndex(
      'role_permissions',
      new TableIndex({
        name: 'IDX_ROLE_PERMISSIONS_ROLE_ID',
        columnNames: ['role_id'],
      })
    );

    await queryRunner.createIndex(
      'role_permissions',
      new TableIndex({
        name: 'IDX_ROLE_PERMISSIONS_PERMISSION_ID',
        columnNames: ['permission_id'],
      })
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'role_permissions',
      new TableForeignKey({
        name: 'FK_ROLE_PERMISSIONS_ROLE',
        columnNames: ['role_id'],
        referencedTableName: 'roles',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'role_permissions',
      new TableForeignKey({
        name: 'FK_ROLE_PERMISSIONS_PERMISSION',
        columnNames: ['permission_id'],
        referencedTableName: 'permissions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.dropForeignKey(
      'role_permissions',
      'FK_ROLE_PERMISSIONS_PERMISSION'
    );
    await queryRunner.dropForeignKey(
      'role_permissions',
      'FK_ROLE_PERMISSIONS_ROLE'
    );

    // Drop indexes
    await queryRunner.dropIndex(
      'role_permissions',
      'IDX_ROLE_PERMISSIONS_PERMISSION_ID'
    );
    await queryRunner.dropIndex(
      'role_permissions',
      'IDX_ROLE_PERMISSIONS_ROLE_ID'
    );

    // Drop table
    await queryRunner.dropTable('role_permissions');
  }
}
