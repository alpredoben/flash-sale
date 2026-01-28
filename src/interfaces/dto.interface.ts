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
