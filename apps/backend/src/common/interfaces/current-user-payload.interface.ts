export interface CurrentUserPayload {
  id: string;
  email: string;
  role: string;
  businessName: string;
  businessId: string;
  staffRole?: string;
  permissions?: string[];
}
