import { TableNames } from '../../shared/constants/tableName.constant';
import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateItemTable1769832842166 implements MigrationInterface {
  name = 'CreateItemTable1769832842166';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type for item status
    await queryRunner.query(`
      CREATE TYPE "item_status_enum" AS ENUM (
        'active',
        'inactive',
        'sold_out',
        'out_of_stock'
      )
    `);

    // Create items table
    await queryRunner.createTable(
      new Table({
        name: TableNames.Item,
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'sku',
            type: 'varchar',
            length: '100',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'price',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'original_price',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'stock',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'reserved_stock',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'available_stock',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'status',
            type: 'item_status_enum',
            default: "'active'",
            isNullable: false,
          },
          {
            name: 'image_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'sale_start_date',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'sale_end_date',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'max_per_user',
            type: 'int',
            default: 1,
            isNullable: false,
          },
          {
            name: 'version',
            type: 'int',
            default: 0,
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
      'items',
      new TableIndex({
        name: 'IDX_ITEMS_SKU',
        columnNames: ['sku'],
        isUnique: true,
      })
    );

    await queryRunner.createIndex(
      'items',
      new TableIndex({
        name: 'IDX_ITEMS_STATUS',
        columnNames: ['status'],
      })
    );

    await queryRunner.createIndex(
      'items',
      new TableIndex({
        name: 'IDX_ITEMS_DELETED_AT',
        columnNames: ['deleted_at'],
      })
    );

    await queryRunner.createIndex(
      'items',
      new TableIndex({
        name: 'IDX_ITEMS_SALE_DATES',
        columnNames: ['sale_start_date', 'sale_end_date'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('items', 'IDX_ITEMS_SALE_DATES');
    await queryRunner.dropIndex('items', 'IDX_ITEMS_DELETED_AT');
    await queryRunner.dropIndex('items', 'IDX_ITEMS_STATUS');
    await queryRunner.dropIndex('items', 'IDX_ITEMS_SKU');

    // Drop table
    await queryRunner.dropTable('items');

    // Drop enum type
    await queryRunner.query(`DROP TYPE "item_status_enum"`);
  }
}
