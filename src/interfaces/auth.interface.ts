import { JwtPayload } from 'jsonwebtoken';

export interface In_AuthResponse {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    avatar?: string | null;
    roles: string[];
    status: string;
    emailVerified: boolean;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

export interface In_TokenPayload {
  userId: string;
  email: string;
  roles?: string[];
  type?: 'access' | 'refresh';
  [key: string]: any;
}

export interface In_DecodedToken extends JwtPayload {
  userId: string;
  email: string;
  roles?: string[];
  type?: 'access' | 'refresh';
  [key: string]: any;
}
