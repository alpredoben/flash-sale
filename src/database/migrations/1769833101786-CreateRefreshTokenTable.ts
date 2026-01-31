import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class CreateRefreshTokenTable1769833101786 implements MigrationInterface {
  name = 'CreateRefreshTokenTable1706659900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create refresh_token table
    await queryRunner.createTable(
      new Table({
        name: 'refresh_token',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'token',
            type: 'varchar',
            length: '500',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'expires_at',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'is_revoked',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'revoked_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'ip_address',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'user_agent',
            type: 'varchar',
            length: '500',
            isNullable: true,
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
        ],
      }),
      true
    );

    // Create indexes
    await queryRunner.createIndex(
      'refresh_token',
      new TableIndex({
        name: 'IDX_REFRESH_TOKEN_TOKEN',
        columnNames: ['token'],
        isUnique: true,
      })
    );

    await queryRunner.createIndex(
      'refresh_token',
      new TableIndex({
        name: 'IDX_REFRESH_TOKEN_USER_ID',
        columnNames: ['user_id'],
      })
    );

    await queryRunner.createIndex(
      'refresh_token',
      new TableIndex({
        name: 'IDX_REFRESH_TOKEN_EXPIRES_AT',
        columnNames: ['expires_at'],
      })
    );

    await queryRunner.createIndex(
      'refresh_token',
      new TableIndex({
        name: 'IDX_REFRESH_TOKEN_IS_REVOKED',
        columnNames: ['is_revoked'],
      })
    );

    // Create foreign key
    await queryRunner.createForeignKey(
      'refresh_token',
      new TableForeignKey({
        name: 'FK_REFRESH_TOKEN_USER',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key
    await queryRunner.dropForeignKey('refresh_token', 'FK_REFRESH_TOKEN_USER');

    // Drop indexes
    await queryRunner.dropIndex(
      'refresh_token',
      'IDX_REFRESH_TOKEN_IS_REVOKED'
    );
    await queryRunner.dropIndex(
      'refresh_token',
      'IDX_REFRESH_TOKEN_EXPIRES_AT'
    );
    await queryRunner.dropIndex('refresh_token', 'IDX_REFRESH_TOKEN_USER_ID');
    await queryRunner.dropIndex('refresh_token', 'IDX_REFRESH_TOKEN_TOKEN');

    // Drop table
    await queryRunner.dropTable('refresh_token');
  }
}
