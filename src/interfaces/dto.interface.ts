import {
  En_ItemStatus,
  En_PermissionAction,
  En_PermissionCategory,
  En_ReservationStatus,
} from '@constants/enum.constant';

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
  email: string;
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

/** ITEM */
export interface In_DTO_CreateItem {
  sku: string;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  stock: number;
  imageUrl?: string;
  saleStartDate?: Date;
  saleEndDate?: Date;
  maxPerUser?: number;
}

export interface In_DTO_UpdateItem {
  name?: string;
  description?: string;
  price?: number;
  originalPrice?: number;
  stock?: number;
  status?: En_ItemStatus;
  imageUrl?: string;
  saleStartDate?: Date;
  saleEndDate?: Date;
  maxPerUser?: number;
}

export interface In_ItemListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: En_ItemStatus;
  sortBy?: 'name' | 'price' | 'stock' | 'createdAt';
  sortOrder?: 'ASC' | 'DESC';
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
}

// RESERVATION

export interface In_DTO_CreateReservation {
  itemId: string;
  quantity: number;
}

export interface In_DTO_CheckoutReservation {
  reservationId: string;
}

export interface In_DTO_CancelReservation {
  reservationId: string;
  reason?: string;
}

export interface In_ReservationListParams {
  page?: number;
  limit?: number;
  status?: En_ReservationStatus;
  userId?: string;
  itemId?: string;
  sortBy?: 'createdAt' | 'expiresAt' | 'totalPrice';
  sortOrder?: 'ASC' | 'DESC';
  startDate?: Date;
  endDate?: Date;
}

export interface In_ReservationResponse {
  id: string;
  reservationCode: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  item: {
    id: string;
    sku: string;
    name: string;
    imageUrl?: string;
  };
  quantity: number;
  price: number;
  totalPrice: number;
  status: En_ReservationStatus;
  expiresAt: Date;
  confirmedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  createdAt: Date;
}
