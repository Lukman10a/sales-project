/**
 * Repositories take `businessId` as their first argument. When a method is
 * handed an entity, this proves the entity belongs to that business, so a
 * mix-up in a caller can never write across tenants.
 */
export class TenantMismatchError extends Error {
  constructor() {
    super('Entity does not belong to this business');
    this.name = 'TenantMismatchError';
  }
}

export function assertTenant(
  businessId: string,
  entity: { businessId?: string | null },
): void {
  if (!businessId || entity.businessId !== businessId) {
    throw new TenantMismatchError();
  }
}
