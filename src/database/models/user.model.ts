import { En_UserStatus } from '@/shared/constants/enum.constant';
import { TableNames } from '@/shared/constants/tableName.constant';
import {
  Column,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  OneToMany,
} from 'typeorm';
import { Role } from './role.model';
import { Reservation } from './reservation.model';
import { AppBaseEntity } from '@models/AppBaseEntity';

@Entity(TableNames.User)
@Index(['email'], { unique: true })
@Index(['status'])
export class User extends AppBaseEntity {
  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100 })
  lastName: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, select: false })
  password: string;

  @Column({
    type: 'enum',
    enum: En_UserStatus,
    default: En_UserStatus.PENDING_VERIFICATION,
  })
  status: En_UserStatus;

  // Many-to-Many relationship with Roles
  @ManyToMany(() => Role, (role: Role) => role.users, { eager: true })
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: Role[];

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatar?: string;

  @Column({ name: 'email_verified', type: 'boolean', default: false })
  emailVerified: boolean;

  @Column({
    name: 'email_verification_token',
    type: 'varchar',
    nullable: true,
    select: false,
  })
  emailVerificationToken?: string | null;

  @Column({
    name: 'email_verification_expires',
    type: 'timestamp',
    nullable: true,
  })
  emailVerificationExpires?: Date | null;

  @Column({
    name: 'password_reset_token',
    type: 'varchar',
    nullable: true,
    select: false,
  })
  passwordResetToken?: string | null;

  @Column({
    name: 'password_reset_expires',
    type: 'timestamp',
    nullable: true,
  })
  passwordResetExpires?: Date | null;

  @Column({ name: 'last_login', type: 'timestamp', nullable: true })
  lastLogin?: Date;

  @OneToMany(() => Reservation, (reservation) => reservation.user)
  reservations: Reservation[];

  // @OneToMany(() => RefreshToken, (token) => token.user)
  // refreshTokens: RefreshToken[];

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  hasRole(roleName: string): boolean {
    return this.roles?.some((r: any) => r.name === roleName);
  }

  hasAnyRole(arrayRoles: string[]): boolean {
    return this.roles?.some((r: any) => arrayRoles.includes(r.name)) || false;
  }

  hasPermission(permissionName: string): boolean {
    if (!this.roles) return false;

    return this.roles.some((r: any) =>
      r.permissions?.some((p: any) => p.name === permissionName)
    );
  }

  hasAnyPermission(arrayPermissions: string[]): boolean {
    if (!this.roles) return false;

    return this.roles.some((r: any) =>
      r.permissions?.some((p: any) => arrayPermissions.includes(p.name))
    );
  }

  hasAllPermissions(arrayPermissions: string[]): boolean {
    if (!this.roles) return false;

    const userPermissions = new Set<string>();
    this.roles.forEach((role) => {
      role.permissions?.forEach((p: any) => {
        userPermissions.add(p.name);
      });
    });

    return arrayPermissions.every((p: any) => userPermissions.has(p));
  }

  isActive(): boolean {
    return this.status === En_UserStatus.ACTIVE;
  }
}
