import { BadRequestException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuditService, actorOf, businessOf, redact } from './audit.service';
import type { AuditRepository } from './audit.repository';
import type { AuditEvent } from '../entities/audit-event.entity';
import { requestContextMiddleware } from '../common/http/request-context';

describe('AuditService', () => {
  let repo: { append: jest.Mock; list: jest.Mock; page: jest.Mock };
  let service: AuditService;

  beforeEach(() => {
    repo = {
      append: jest.fn().mockResolvedValue(undefined),
      list: jest.fn(),
      page: jest.fn(),
    };
    service = new AuditService(repo as unknown as AuditRepository);
  });

  const appended = () =>
    repo.append.mock.lastCall as [string, Record<string, unknown>];

  describe('record', () => {
    it('appends one event with the actor and session', async () => {
      await service.record({
        businessId: 'b1',
        actor: { id: 'u1', name: 'Ada', sessionId: 'sid-1' },
        action: 'sale.recorded',
        entityType: 'sale',
        entityId: 's1',
        after: { total: 10 },
      });
      expect(repo.append).toHaveBeenCalledTimes(1);
      const [businessId, event] = appended();
      expect(businessId).toBe('b1');
      expect(event).toEqual({
        actorUserId: 'u1',
        actorName: 'Ada',
        action: 'sale.recorded',
        entityType: 'sale',
        entityId: 's1',
        before: null,
        after: { total: 10 },
        ip: null,
        userAgent: null,
        sessionId: 'sid-1',
      });
    });

    it('takes ip and user agent from the current request', async () => {
      const req = {
        ip: '1.2.3.4',
        headers: { 'user-agent': 'UA' },
      } as unknown as Request;
      await new Promise<void>((done, fail) => {
        requestContextMiddleware(req, {} as Response, () => {
          service
            .record({
              businessId: 'b1',
              actor: null,
              action: 'auth.sign_in_failed',
              entityType: 'user',
            })
            .then(done, fail);
        });
      });
      expect(appended()[1]).toMatchObject({
        ip: '1.2.3.4',
        userAgent: 'UA',
        actorUserId: null,
        actorName: 'System',
      });
    });

    it('prefers an explicit client context', async () => {
      await service.record({
        businessId: 'b1',
        actor: { id: 'u1', email: 'a@b.c' },
        action: 'auth.signed_in',
        entityType: 'user',
        context: { ip: '9.9.9.9' },
      });
      expect(appended()[1]).toMatchObject({
        ip: '9.9.9.9',
        actorName: 'a@b.c',
      });
    });

    it('never stores secrets', async () => {
      await service.record({
        businessId: 'b1',
        actor: null,
        action: 'staff.invited',
        entityType: 'team_member',
        after: { name: 'Jo', password: 'x', temporaryPassword: 'y' },
      });
      expect(appended()[1].after).toEqual({
        name: 'Jo',
        password: '[redacted]',
        temporaryPassword: '[redacted]',
      });
    });

    it('propagates a failed insert so the change rolls back', async () => {
      repo.append.mockRejectedValue(new Error('insert failed'));
      await expect(
        service.record({
          businessId: 'b1',
          actor: null,
          action: 'sale.recorded',
          entityType: 'sale',
        }),
      ).rejects.toThrow('insert failed');
    });
  });

  describe('redact', () => {
    it('masks secret keys at any depth and keeps the rest', () => {
      expect(
        redact({
          a: 1,
          nested: {
            refreshToken: 't',
            codeHash: 'h',
            code: '123456',
            ok: true,
          },
          list: [{ twoFactorSecret: 's', name: 'n' }],
          at: new Date('2026-01-01T00:00:00.000Z'),
        }),
      ).toEqual({
        a: 1,
        nested: {
          refreshToken: '[redacted]',
          codeHash: '[redacted]',
          code: '[redacted]',
          ok: true,
        },
        list: [{ twoFactorSecret: '[redacted]', name: 'n' }],
        at: '2026-01-01T00:00:00.000Z',
      });
    });
  });

  describe('list', () => {
    const row = (id: string, at: string) =>
      ({ id, createdAt: new Date(at) }) as AuditEvent;

    it('returns a page and a cursor when there is more', async () => {
      repo.list.mockResolvedValue([
        row('e3', '2026-11-03T00:00:00.000Z'),
        row('e2', '2026-11-02T00:00:00.000Z'),
        row('e1', '2026-11-01T00:00:00.000Z'),
      ]);
      const result = await service.list('b1', { limit: 2 });
      expect(repo.list).toHaveBeenCalledWith(
        'b1',
        expect.objectContaining({ limit: 3, before: undefined }),
      );
      expect(result.data.map((e) => e.id)).toEqual(['e3', 'e2']);
      expect(result.nextCursor).toEqual(expect.any(String));

      repo.list.mockResolvedValue([row('e1', '2026-11-01T00:00:00.000Z')]);
      const next = await service.list('b1', {
        limit: 2,
        cursor: result.nextCursor ?? undefined,
        action: 'sale.recorded',
      });
      expect((repo.list.mock.lastCall as unknown[])[1]).toMatchObject({
        action: 'sale.recorded',
        before: { id: 'e2', createdAt: new Date('2026-11-02T00:00:00.000Z') },
      });
      expect(next.nextCursor).toBeNull();
    });

    it('rejects a malformed cursor', async () => {
      await expect(
        service.list('b1', { limit: 10, cursor: 'garbage' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('pages the trail for the activity feed', async () => {
      repo.page.mockResolvedValue([[], 0]);
      await service.page('b1', 2, 20);
      expect(repo.page).toHaveBeenCalledWith('b1', 2, 20);
    });
  });

  describe('helpers', () => {
    it('names the actor and files account events under the business', () => {
      const user = {
        id: 'u1',
        email: 'a@b.c',
        firstName: 'Ada',
        lastName: 'Obi',
        businessId: 'b1',
      };
      expect(actorOf(user, 'sid')).toEqual({
        id: 'u1',
        name: 'Ada Obi',
        email: 'a@b.c',
        sessionId: 'sid',
      });
      expect(businessOf(user)).toBe('b1');
      expect(businessOf({ id: 'owner', businessId: null as never })).toBe(
        'owner',
      );
    });
  });
});
