import { Entity, Column, Index, ManyToMany } from 'typeorm';
import { BaseEntity } from './baseEntity.model';
import { Role } from './role.model';
import { TableNames } from '@/shared/constants/tableName.constant';
import {
  En_PermissionAction,
  En_PermissionCategory,
} from '@/shared/constants/enum.constant';

@Entity(TableNames.Permission)
@Index(['name'], { unique: true })
@Index(['slug'], { unique: true })
@Index(['category'])
@Index(['resource'])
export class Permission extends BaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: En_PermissionCategory,
  })
  category: En_PermissionCategory;

  @Column({ type: 'varchar', length: 50 })
  resource: string; // e.g., 'users', 'items', 'reservations'

  @Column({
    type: 'enum',
    enum: En_PermissionAction,
  })
  action: En_PermissionAction;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem: boolean; // System permissions cannot be deleted

  // Many-to-Many relationship with Roles
  @ManyToMany(() => Role, (role) => role.permissions)
  roles: Role[];

  // Helper method
  getFullName(): string {
    return `${this.resource}.${this.action}`;
  }

  canBeDeleted(): boolean {
    return !this.isSystem;
  }

  static buildPermissionName(
    resource: string,
    action: En_PermissionAction
  ): string {
    return `${resource}.${action}`;
  }

  static buildPermissionSlug(
    resource: string,
    action: En_PermissionAction
  ): string {
    return `${resource}_${action}`.toLowerCase();
  }
}
