import { BadRequestException } from '@nestjs/common';
import { AUTH_TOKEN_TTL_MS, AuthTokensService } from './auth-tokens.service';
import type { AuthTokensRepository } from './auth-tokens.repository';
import { hashToken } from './sessions.service';
import type { AuthToken } from '../entities/auth-token.entity';

describe('AuthTokensService', () => {
  let repo: {
    invalidate: jest.Mock;
    consume: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let service: AuthTokensService;

  beforeEach(() => {
    repo = {
      invalidate: jest.fn().mockResolvedValue(undefined),
      consume: jest.fn(),
      create: jest.fn((d: Partial<AuthToken>) => d),
      save: jest.fn((d: Partial<AuthToken>) => Promise.resolve(d)),
    };
    service = new AuthTokensService(repo as unknown as AuthTokensRepository);
  });

  it('supersedes older tokens and stores only the hash with a 30-minute expiry', async () => {
    const before = Date.now();
    const raw = await service.issue('u1', 'reset_password');

    expect(repo.invalidate).toHaveBeenCalledWith('u1', 'reset_password');
    const saved = (repo.save.mock.calls as unknown[][])[0][0] as AuthToken;
    expect(saved.tokenHash).toBe(hashToken(raw));
    expect(saved).not.toHaveProperty('token');
    expect(saved.expiresAt.getTime() - before).toBeGreaterThanOrEqual(
      AUTH_TOKEN_TTL_MS - 1000,
    );
    expect(saved.expiresAt.getTime() - before).toBeLessThanOrEqual(
      AUTH_TOKEN_TTL_MS + 1000,
    );
    expect(raw).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('returns the owner of a live token', async () => {
    repo.consume.mockResolvedValue('u1');
    await expect(service.consume('raw', 'verify_email')).resolves.toBe('u1');
    expect(repo.consume).toHaveBeenCalledWith(hashToken('raw'), 'verify_email');
  });

  it('rejects a used, expired or unknown token', async () => {
    repo.consume.mockResolvedValue(null);
    await expect(service.consume('raw', 'verify_email')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
