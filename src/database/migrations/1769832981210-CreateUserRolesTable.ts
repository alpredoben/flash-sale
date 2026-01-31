import { TableNames } from '../../shared/constants/tableName.constant';
import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class CreateUserRolesTable1769832981210 implements MigrationInterface {
  name = 'CreateUserRolesTable1769832981210';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create user_roles junction table
    await queryRunner.createTable(
      new Table({
        name: TableNames.UserRoles,
        columns: [
          {
            name: 'user_id',
            type: 'uuid',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'role_id',
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
      'user_roles',
      new TableIndex({
        name: 'IDX_USER_ROLES_USER_ID',
        columnNames: ['user_id'],
      })
    );

    await queryRunner.createIndex(
      'user_roles',
      new TableIndex({
        name: 'IDX_USER_ROLES_ROLE_ID',
        columnNames: ['role_id'],
      })
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'user_roles',
      new TableForeignKey({
        name: 'FK_USER_ROLES_USER',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'user_roles',
      new TableForeignKey({
        name: 'FK_USER_ROLES_ROLE',
        columnNames: ['role_id'],
        referencedTableName: 'roles',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.dropForeignKey('user_roles', 'FK_USER_ROLES_ROLE');
    await queryRunner.dropForeignKey('user_roles', 'FK_USER_ROLES_USER');

    // Drop indexes
    await queryRunner.dropIndex('user_roles', 'IDX_USER_ROLES_ROLE_ID');
    await queryRunner.dropIndex('user_roles', 'IDX_USER_ROLES_USER_ID');

    // Drop table
    await queryRunner.dropTable('user_roles');
  }
}
