export interface CurrentUserPayload {
  id: string;
  email: string;
  role: string;
  businessName: string;
  businessId: string;
  permissions?: string[];
}
