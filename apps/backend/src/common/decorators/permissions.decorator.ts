import { SetMetadata } from '@nestjs/common';
import type { Permission } from '../constants/permissions';

export const PERMISSIONS_KEY = 'permissions';

/** The request needs at least one of these permissions (owners hold all). */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
