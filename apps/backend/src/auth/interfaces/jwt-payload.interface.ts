export interface JwtPayload {
  sub: string; // user ID
  email: string;
  role: string;
  businessId: string;
  businessName: string;
  permissions?: string[];
}
