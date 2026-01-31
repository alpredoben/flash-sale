import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class CreateReservationTable1769832901111 implements MigrationInterface {
  name = 'CreateReservationsTable1706659600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type for reservation status
    await queryRunner.query(`
      CREATE TYPE "reservation_status_enum" AS ENUM (
        'pending',
        'confirmed',
        'expired',
        'cancelled'
      )
    `);

    // Create reservations table
    await queryRunner.createTable(
      new Table({
        name: 'reservations',
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
            name: 'item_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'quantity',
            type: 'int',
            default: 1,
            isNullable: false,
          },
          {
            name: 'price',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'total_price',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'status',
            type: 'reservation_status_enum',
            default: "'pending'",
            isNullable: false,
          },
          {
            name: 'expires_at',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'confirmed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'cancelled_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'cancellation_reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'reservation_code',
            type: 'varchar',
            length: '50',
            isNullable: false,
            isUnique: true,
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
      'reservations',
      new TableIndex({
        name: 'IDX_RESERVATIONS_USER_ITEM',
        columnNames: ['user_id', 'item_id'],
      })
    );

    await queryRunner.createIndex(
      'reservations',
      new TableIndex({
        name: 'IDX_RESERVATIONS_STATUS',
        columnNames: ['status'],
      })
    );

    await queryRunner.createIndex(
      'reservations',
      new TableIndex({
        name: 'IDX_RESERVATIONS_EXPIRES_AT',
        columnNames: ['expires_at'],
      })
    );

    await queryRunner.createIndex(
      'reservations',
      new TableIndex({
        name: 'IDX_RESERVATIONS_CODE',
        columnNames: ['reservation_code'],
        isUnique: true,
      })
    );

    await queryRunner.createIndex(
      'reservations',
      new TableIndex({
        name: 'IDX_RESERVATIONS_DELETED_AT',
        columnNames: ['deleted_at'],
      })
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'reservations',
      new TableForeignKey({
        name: 'FK_RESERVATIONS_USER',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'reservations',
      new TableForeignKey({
        name: 'FK_RESERVATIONS_ITEM',
        columnNames: ['item_id'],
        referencedTableName: 'items',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.dropForeignKey('reservations', 'FK_RESERVATIONS_ITEM');
    await queryRunner.dropForeignKey('reservations', 'FK_RESERVATIONS_USER');

    // Drop indexes
    await queryRunner.dropIndex('reservations', 'IDX_RESERVATIONS_DELETED_AT');
    await queryRunner.dropIndex('reservations', 'IDX_RESERVATIONS_CODE');
    await queryRunner.dropIndex('reservations', 'IDX_RESERVATIONS_EXPIRES_AT');
    await queryRunner.dropIndex('reservations', 'IDX_RESERVATIONS_STATUS');
    await queryRunner.dropIndex('reservations', 'IDX_RESERVATIONS_USER_ITEM');

    // Drop table
    await queryRunner.dropTable('reservations');

    // Drop enum type
    await queryRunner.query(`DROP TYPE "reservation_status_enum"`);
  }
}
