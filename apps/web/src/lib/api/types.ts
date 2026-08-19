export interface ApiEnvelope<T> {
  data: T;
  pagination: Pagination;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ApiErrorBody {
  message: string | string[];
  error?: string;
  statusCode?: number;
  errors?: Array<{ field?: string; message: string }>;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  businessName: string;
  businessId: string;
  role: string;
  avatar?: string;
  staffRole?: string;
}

export interface AuthResponse {
  user: AuthUser;
  access_token: string;
  refresh_token: string;
}

export interface SalesSummary {
  totalSales: number;
  totalTransactions: number;
  averageTransaction: number;
}

// GET /sales adds `summary` on top of the standard envelope
export interface SalesListEnvelope<T> extends ApiEnvelope<T[]> {
  summary: SalesSummary;
}

export interface RefreshResponse {
  access_token: string;
  refresh_token: string;
}

// GET /auth/me returns the full user shape (id, email, firstName, lastName,
// businessName, businessId, role, avatar, staffRole)
export type MeResponse = AuthUser;