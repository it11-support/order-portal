import { User } from "../user"

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface LoginRequestBody {
  username?: string;
  password?: string;
}

export interface AuthUserResponse extends User { }

export interface LoginSuccessResponse {
  message: string;
  token: string;
  user: AuthUserResponse;
}

export interface AuthErrorResponse {
  message: string;
  error?: string;
}

export interface JWTPayload {
  userId: number;
  username: string;
  role: string;
  customerId: string | null;
}

export interface ApiSuccess<T> {
  data: T;
}

export interface ApiError {
  message: string;
  code?: string;
}