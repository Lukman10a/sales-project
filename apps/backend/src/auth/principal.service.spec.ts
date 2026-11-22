import { Logger } from '@nestjs/common';
import {
  MemoryPrincipalCache,
  RedisPrincipalCache,
  PrincipalService,
  type Principal,
} from './principal.service';
import type { UsersRepository } from './users.repository';
import type { TeamMemberRepository } from './team-members.repository';

const owner = {
  id: 'o1',
  email: 'ada@shop.ng',
  role: 'owner',
  businessId: 'o1',
  businessName: 'Shop',
  status: 'active',
};
const cashierUser = {
  ...owner,
  id: 'c1',
  email: 'kelechi@shop.ng',
  role: 'cashier',
};
const member = {
  role: 'cashier',
  status: 'active',
  permissions: ['sales.record', 'record-sales'],
  maxDiscountPercent: 5,
};

describe('PrincipalService', () => {
  let findById: jest.Mock;
  let findByBusinessAndUser: jest.Mock;
  let service: PrincipalService;

  beforeEach(() => {
    findById = jest.fn((id: string) =>
      Promise.resolve(
        id === owner.id
          ? { ...owner }
          : id === 'c1'
            ? { ...cashierUser }
            : null,
      ),
    );
    findByBusinessAndUser = jest.fn().mockResolvedValue({ ...member });
    service = new PrincipalService(
      { findById } as unknown as UsersRepository,
      { findByBusinessAndUser } as unknown as TeamMemberRepository,
      new MemoryPrincipalCache(),
    );
  });

  it('gives the owner every permission in their own business', async () => {
    const p = await service.resolve('o1', 'o1');
    expect(p).toMatchObject({ role: 'owner', maxDiscountPercent: 100 });
    expect(p?.permissions).toContain('billing.manage');
    expect(findByBusinessAndUser).not.toHaveBeenCalled();
  });

  it("uses the staff member's row, dropping unknown permission names", async () => {
    await expect(service.resolve('c1', 'o1')).resolves.toMatchObject({
      role: 'cashier',
      permissions: ['sales.record'],
      maxDiscountPercent: 5,
    });
    expect(findByBusinessAndUser).toHaveBeenCalledWith('o1', 'c1');
  });

  it.each([
    ['an unknown user', 'nobody', 'o1'],
    ['another business', 'c1', 'other'],
  ])('refuses %s', async (_label, userId, businessId) => {
    await expect(service.resolve(userId, businessId)).resolves.toBeNull();
  });

  it('refuses deactivated users and members, and missing memberships', async () => {
    findByBusinessAndUser.mockResolvedValueOnce({
      ...member,
      status: 'inactive',
    });
    await expect(service.resolve('c1', 'o1')).resolves.toBeNull();
    findByBusinessAndUser.mockResolvedValueOnce(null);
    await expect(service.resolve('c1', 'o1')).resolves.toBeNull();
    findById.mockResolvedValueOnce({ ...cashierUser, status: 'inactive' });
    await expect(service.resolve('c1', 'o1')).resolves.toBeNull();
  });

  it('caches until invalidated', async () => {
    await service.resolve('c1', 'o1');
    findByBusinessAndUser.mockResolvedValue({
      ...member,
      permissions: ['sales.record', 'sales.refund'],
    });
    expect((await service.resolve('c1', 'o1'))?.permissions).toEqual([
      'sales.record',
    ]);
    await service.invalidate('c1');
    expect((await service.resolve('c1', 'o1'))?.permissions).toEqual([
      'sales.record',
      'sales.refund',
    ]);
  });

  it('never serves a cached principal for another business', async () => {
    await service.resolve('c1', 'o1');
    await expect(service.resolve('c1', 'other')).resolves.toBeNull();
  });
});

describe('MemoryPrincipalCache', () => {
  it('expires entries after the TTL', async () => {
    let now = 0;
    const cache = new MemoryPrincipalCache(1000, () => now);
    await cache.set('u', { id: 'u' } as Principal);
    now = 999;
    expect(await cache.get('u')).toBeDefined();
    now = 1000;
    expect(await cache.get('u')).toBeUndefined();
  });
});

describe('RedisPrincipalCache', () => {
  const principal = { id: 'u', businessId: 'b' } as Principal;

  function fakeRedis() {
    const store = new Map<string, string>();
    return {
      store,
      get: jest.fn((k: string) => Promise.resolve(store.get(k) ?? null)),
      set: jest.fn((k: string, v: string) => {
        store.set(k, v);
        return Promise.resolve('OK');
      }),
      del: jest.fn((k: string) => Promise.resolve(Number(store.delete(k)))),
    };
  }

  it('stores principals under a prefixed key with the TTL', async () => {
    const redis = fakeRedis();
    const cache = new RedisPrincipalCache(redis as never, 30_000);

    await cache.set('u', principal);
    expect(redis.set).toHaveBeenCalledWith(
      'luxa:principal:u',
      JSON.stringify(principal),
      'PX',
      30_000,
    );
    await expect(cache.get('u')).resolves.toEqual(principal);
    await cache.delete('u');
    await expect(cache.get('u')).resolves.toBeUndefined();
  });

  it('treats an unreachable Redis as a miss and never fails a request', async () => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const error = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const down = () => Promise.reject(new Error('ECONNREFUSED'));
    const cache = new RedisPrincipalCache({
      get: down,
      set: down,
      del: down,
    });

    await expect(cache.get('u')).resolves.toBeUndefined();
    await expect(cache.set('u', principal)).resolves.toBeUndefined();
    await expect(cache.delete('u')).resolves.toBeUndefined();
    expect(error).toHaveBeenCalled();
    jest.restoreAllMocks();
  });
});
