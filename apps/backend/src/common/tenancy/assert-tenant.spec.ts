import { TenantMismatchError, assertTenant } from './assert-tenant';

describe('assertTenant', () => {
  it('passes for an entity of the same business', () => {
    expect(() => assertTenant('b1', { businessId: 'b1' })).not.toThrow();
  });

  it.each([
    ['another business', 'b1', { businessId: 'b2' }],
    ['no business on the entity', 'b1', { businessId: null }],
    ['an empty business id', '', { businessId: '' }],
  ])('throws for %s', (_label, businessId, entity) => {
    expect(() => assertTenant(businessId, entity)).toThrow(TenantMismatchError);
  });
});
