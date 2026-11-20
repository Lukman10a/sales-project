import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import {
  REMEMBERED_TTL_MS,
  SESSION_TTL_MS,
  SessionsService,
  hashToken,
} from './sessions.service';
import type { SessionsRepository } from './sessions.repository';
import type { Session } from '../entities/session.entity';

const CTX = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/131.0',
  ip: '1.2.3.4',
};

function row(overrides: Partial<Session> = {}): Session {
  return {
    id: 'row-1',
    userId: 'u1',
    businessId: 'b1',
    tokenHash: 'h',
    familyId: 'fam-1',
    persistent: true,
    deviceLabel: 'Chrome on Windows',
    userAgent: CTX.userAgent,
    ip: CTX.ip,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    lastUsedAt: new Date('2026-01-01T00:00:00Z'),
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    revokedReason: null,
    ...overrides,
  };
}

describe('SessionsService', () => {
  let repo: jest.Mocked<
    Pick<
      SessionsRepository,
      | 'findByTokenHash'
      | 'claim'
      | 'revokeFamily'
      | 'revokeFamilyForUser'
      | 'revokeAllForUser'
      | 'revokeAllForUserExcept'
      | 'findActiveForUser'
      | 'isFamilyActive'
      | 'create'
      | 'save'
    >
  >;
  let service: SessionsService;
  let saved: Partial<Session>[];

  beforeEach(() => {
    saved = [];
    repo = {
      findByTokenHash: jest.fn(),
      claim: jest.fn().mockResolvedValue(true),
      revokeFamily: jest.fn().mockResolvedValue(2),
      revokeFamilyForUser: jest.fn().mockResolvedValue(1),
      revokeAllForUser: jest.fn().mockResolvedValue(3),
      revokeAllForUserExcept: jest.fn().mockResolvedValue(1),
      findActiveForUser: jest.fn().mockResolvedValue([]),
      isFamilyActive: jest.fn().mockResolvedValue(true),
      create: jest.fn((data) => data as Session) as never,
      save: jest.fn((data: Partial<Session>) => {
        saved.push(data);
        return Promise.resolve(data as Session);
      }) as never,
    };
    service = new SessionsService(repo as unknown as SessionsRepository);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('start', () => {
    it('stores only the token hash and labels the device', async () => {
      const issued = await service.start(
        { id: 'u1', businessId: 'b1' },
        CTX,
        false,
      );

      expect(issued.refreshToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(saved[0].tokenHash).toBe(hashToken(issued.refreshToken));
      expect(saved[0]).not.toHaveProperty('refreshToken');
      expect(saved[0].familyId).toBe(issued.familyId);
      expect(saved[0].deviceLabel).toBe('Chrome on Windows');
      expect(saved[0].ip).toBe('1.2.3.4');
    });

    it('lasts 30 days when the device is trusted, a day otherwise', async () => {
      const now = Date.now();
      const trusted = await service.start(
        { id: 'u1', businessId: 'b1' },
        CTX,
        true,
      );
      const brief = await service.start(
        { id: 'u1', businessId: 'b1' },
        CTX,
        false,
      );

      expect(trusted.expiresAt.getTime() - now).toBeGreaterThanOrEqual(
        REMEMBERED_TTL_MS - 1000,
      );
      expect(brief.expiresAt.getTime() - now).toBeLessThanOrEqual(
        SESSION_TTL_MS + 1000,
      );
    });
  });

  describe('rotate', () => {
    it('revokes the presented token and issues a successor in the same family', async () => {
      const current = row();
      repo.findByTokenHash.mockResolvedValue(current);

      const { userId, issued } = await service.rotate('old-token', CTX);

      expect(repo.findByTokenHash).toHaveBeenCalledWith(hashToken('old-token'));
      expect(repo.claim).toHaveBeenCalledWith('row-1', 'rotated');
      expect(userId).toBe('u1');
      expect(issued.familyId).toBe('fam-1');
      expect(issued.refreshToken).not.toBe('old-token');
      expect(saved[0].createdAt).toBe(current.createdAt);
      expect(saved[0].persistent).toBe(true);
    });

    it('rejects an unknown token', async () => {
      repo.findByTokenHash.mockResolvedValue(null);
      await expect(service.rotate('nope', CTX)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('revokes the whole family when a rotated token is reused', async () => {
      repo.findByTokenHash.mockResolvedValue(
        row({ revokedAt: new Date(), revokedReason: 'rotated' }),
      );
      const warn = jest.spyOn(service['logger'], 'warn');

      await expect(service.rotate('stolen', CTX)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(repo.revokeFamily).toHaveBeenCalledWith('fam-1', 'reuse');
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('auth.refresh_token_reuse'),
      );
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('treats losing the claim race as reuse', async () => {
      repo.findByTokenHash.mockResolvedValue(row());
      repo.claim.mockResolvedValue(false);

      await expect(service.rotate('dup', CTX)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(repo.revokeFamily).toHaveBeenCalledWith('fam-1', 'reuse');
    });

    it('rejects a logged-out token without treating it as reuse', async () => {
      repo.findByTokenHash.mockResolvedValue(
        row({ revokedAt: new Date(), revokedReason: 'logout' }),
      );
      await expect(service.rotate('t', CTX)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(repo.revokeFamily).not.toHaveBeenCalled();
    });

    it('rejects an expired session', async () => {
      repo.findByTokenHash.mockResolvedValue(
        row({ expiresAt: new Date(Date.now() - 1) }),
      );
      await expect(service.rotate('t', CTX)).rejects.toThrow('Session expired');
      expect(repo.claim).not.toHaveBeenCalled();
    });
  });

  it('revokes the current session on logout', async () => {
    await service.revoke('fam-1');
    expect(repo.revokeFamily).toHaveBeenCalledWith('fam-1', 'logout');
  });

  it('revokes every other session, keeping the current one', async () => {
    await expect(service.revokeOthers('u1', 'fam-1')).resolves.toBe(1);
    expect(repo.revokeAllForUserExcept).toHaveBeenCalledWith(
      'u1',
      'fam-1',
      'revoked',
    );
    await service.revokeOthers('u1');
    expect(repo.revokeAllForUser).toHaveBeenCalledWith('u1', 'revoked');
  });

  it('revokes every session of the user', async () => {
    await expect(service.revokeAll('u1')).resolves.toBe(3);
    expect(repo.revokeAllForUser).toHaveBeenCalledWith('u1', 'logout');
  });

  it('revokes one of the user’s sessions, 404 when it is not theirs', async () => {
    await service.revokeOne('u1', 'fam-1');
    expect(repo.revokeFamilyForUser).toHaveBeenCalledWith(
      'u1',
      'fam-1',
      'revoked',
    );

    repo.revokeFamilyForUser.mockResolvedValue(0);
    await expect(service.revokeOne('u1', 'other')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('lists sessions by family id and flags the current one', async () => {
    repo.findActiveForUser.mockResolvedValue([
      row(),
      row({ id: 'row-2', familyId: 'fam-2' }),
    ]);

    const list = await service.list('u1', 'fam-2');

    expect(list.map((s) => [s.id, s.current])).toEqual([
      ['fam-1', false],
      ['fam-2', true],
    ]);
    expect(list[0]).not.toHaveProperty('tokenHash');
  });

  it('delegates liveness checks to the repository', async () => {
    await expect(service.isActive('fam-1')).resolves.toBe(true);
    expect(repo.isFamilyActive).toHaveBeenCalledWith('fam-1');
  });
});
