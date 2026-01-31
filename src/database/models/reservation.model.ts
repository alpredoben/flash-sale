import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { AppBaseEntity } from './AppBaseEntity';
import { TableNames } from '../../shared/constants/tableName.constant';
import { En_ReservationStatus } from '../../shared/constants/enum.constant';
import { Item } from './item.model';
import { User } from './user.model';

@Entity(TableNames.Reservation)
@Index(['userId', 'itemId'])
@Index(['status'])
@Index(['expiresAt'])
export class Reservation extends AppBaseEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (user: User) => user.reservations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'item_id', type: 'uuid' })
  itemId: string;

  @ManyToOne(() => Item, (item: Item) => item.reservations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'item_id' })
  item: Item;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ name: 'total_price', type: 'decimal', precision: 10, scale: 2 })
  totalPrice: number;

  @Column({
    type: 'enum',
    enum: En_ReservationStatus,
    default: En_ReservationStatus.PENDING,
  })
  status: En_ReservationStatus;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @Column({ name: 'confirmed_at', type: 'timestamp', nullable: true })
  confirmedAt?: Date;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt?: Date;

  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellationReason?: string;

  @Column({
    name: 'reservation_code',
    type: 'varchar',
    length: 50,
    unique: true,
  })
  reservationCode: string;
}
