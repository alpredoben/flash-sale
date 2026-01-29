import {
  En_PermissionAction,
  En_PermissionCategory,
} from '@/shared/constants/enum.constant';

export interface In_DTO_Register {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone?: string;
}

export interface In_DTO_Login {
  email: string;
  password: string;
}

export interface In_DTO_RefreshToken {
  refreshToken: string;
}

export interface In_DTO_VerifyEmail {
  token: string;
}

export interface In_DTO_ForgotPassword {
  email: string;
}

export interface In_DTO_ResetPassword {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface In_DTO_ManualChangePassword {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/** ROLE */
export interface In_DTO_CreateRole {
  name: string;
  description?: string;
  permissionIds?: string[];
}

export interface In_DTO_UpdateRole {
  name?: string;
  description?: string;
  isActive?: boolean;
  permissionIds?: string[];
}

/** PERMISSION */
export interface In_DTO_CreatePermission {
  name: string;
  description?: string;
  category: En_PermissionCategory;
  resource: string;
  action: En_PermissionAction;
}

export interface In_DTO_UpdatePermission {
  name?: string;
  description?: string;
  category?: En_PermissionCategory;
  resource?: string;
  action?: En_PermissionAction;
  isActive?: boolean;
}
