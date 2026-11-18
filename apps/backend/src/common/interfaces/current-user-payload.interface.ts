import type { Permission, UserRole } from '../constants/permissions';

/** The authenticated principal on `req.user`, resolved per request. */
export interface CurrentUserPayload {
  id: string;
  email: string;
  role: UserRole;
  businessName: string;
  businessId: string;
  permissions: Permission[];
  /** Largest discount this person may give, in percent. */
  maxDiscountPercent: number;
  /** Session (device) the request was authenticated with. */
  sessionId?: string;
}
