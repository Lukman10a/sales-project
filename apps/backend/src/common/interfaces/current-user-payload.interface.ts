export interface CurrentUserPayload {
  id: string;
  email: string;
  role: string;
  businessName: string;
  businessId: string;
  staffRole?: string;
  permissions?: string[];
  /** Session (device) the request was authenticated with. */
  sessionId?: string;
}
