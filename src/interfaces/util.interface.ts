import { JwtPayload } from 'jsonwebtoken';

export interface In_CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
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


