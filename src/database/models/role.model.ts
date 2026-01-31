import { Column, Entity, Index, JoinTable, ManyToMany } from 'typeorm';
import { AppBaseEntity } from './AppBaseEntity';
import { TableNames } from '../../shared/constants/tableName.constant';
import { En_RoleType } from '../../shared/constants/enum.constant';
import { User } from './user.model';
import { Permission } from './permission.model';

@Entity(TableNames.Role)
@Index(['name'], { unique: true })
@Index(['slug'], { unique: true })
@Index(['type'])
export class Role extends AppBaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: En_RoleType,
    default: En_RoleType.CUSTOM,
  })
  type: En_RoleType;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @ManyToMany(() => User, (user: User) => user.roles)
  users: User[];

  @ManyToMany(() => Permission, (permission: Permission) => permission.roles, {
    eager: true,
  })
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions: Permission[];

  // Helper methods
  hasPermission(permissionName: string): boolean {
    return (
      this.permissions?.some((p: any) => p.name === permissionName) || false
    );
  }

  hasAnyPermission(arrayPermissions: string[]): boolean {
    return (
      this.permissions?.some((p: any) => arrayPermissions.includes(p.name)) ||
      false
    );
  }

  hasAllPermissions(arrayPermissions: string[]): boolean {
    const rolePermissionNames = this.permissions?.map((p) => p.name) || [];
    return arrayPermissions.every((p: any) => rolePermissionNames.includes(p));
  }

  canBeDeleted(): boolean {
    return this.type !== En_RoleType.SYSTEM;
  }

  canBeModified(): boolean {
    return this.type !== En_RoleType.SYSTEM || this.isActive;
  }
}
