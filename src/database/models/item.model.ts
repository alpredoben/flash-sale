import { En_ItemStatus } from '@constants/enum.constant';
import { TableNames } from '@constants/tableName.constant';
import { Column, Entity, Index, OneToMany } from 'typeorm';
import { Reservation } from '@models/reservation.model';
import { AppBaseEntity } from '@models/AppBaseEntity';

@Entity(TableNames.Item)
@Index(['sku'], { unique: true })
@Index(['status'])
export class Item extends AppBaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  sku: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({
    name: 'original_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  originalPrice?: number;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column({ name: 'reserved_stock', type: 'int', default: 0 })
  reservedStock: number;

  @Column({ name: 'available_stock', type: 'int', default: 0 })
  availableStock: number;

  @Column({
    type: 'enum',
    enum: En_ItemStatus,
    default: En_ItemStatus.ACTIVE,
  })
  status: En_ItemStatus;

  @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
  imageUrl?: string;

  @Column({ name: 'sale_start_date', type: 'timestamp', nullable: true })
  saleStartDate?: Date;

  @Column({ name: 'sale_end_date', type: 'timestamp', nullable: true })
  saleEndDate?: Date;

  @Column({ name: 'max_per_user', type: 'int', default: 1 })
  maxPerUser: number;

  @Column({ type: 'int', default: 0 })
  version: number;

  @OneToMany(() => Reservation, (reservation: Reservation) => reservation.item)
  reservations: Reservation[];
}
