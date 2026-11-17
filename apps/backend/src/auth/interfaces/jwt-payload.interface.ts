export interface JwtPayload {
  sub: string; // user ID
  sid: string; // session (family) id; checked against the sessions table
  email: string;
  role: string;
  businessId: string;
  businessName: string;
  staffRole?: string;
  permissions?: string[];
}
