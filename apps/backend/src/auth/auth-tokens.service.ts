import { BadRequestException, Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { AuthTokenPurpose } from '../entities/auth-token.entity';
import { AuthTokensRepository } from './auth-tokens.repository';
import { hashToken } from './sessions.service';

export const AUTH_TOKEN_TTL_MS = 30 * 60_000;

/** Email verification and password reset tokens: single-use, 30 minutes. */
@Injectable()
export class AuthTokensService {
  constructor(private readonly tokens: AuthTokensRepository) {}

  /** Issues a fresh token; any earlier unused token of this purpose dies. */
  async issue(userId: string, purpose: AuthTokenPurpose): Promise<string> {
    await this.tokens.invalidate(userId, purpose);
    const raw = randomBytes(32).toString('base64url');
    await this.tokens.save(
      this.tokens.create({
        userId,
        purpose,
        tokenHash: hashToken(raw),
        expiresAt: new Date(Date.now() + AUTH_TOKEN_TTL_MS),
        usedAt: null,
      }),
    );
    return raw;
  }

  /** Spends a token and returns its user id, or rejects with one message. */
  async consume(raw: string, purpose: AuthTokenPurpose): Promise<string> {
    const userId = await this.tokens.consume(hashToken(raw), purpose);
    if (!userId) {
      throw new BadRequestException('This link is invalid or has expired');
    }
    return userId;
  }
}
