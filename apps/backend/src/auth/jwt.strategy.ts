import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import {
  ExtractJwt,
  Strategy,
  type JwtFromRequestFunction,
} from 'passport-jwt';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import type { CurrentUserPayload } from '../common';
import { ACCESS_COOKIE, parseCookies } from '../common/http/cookies';
import { SessionsService } from './sessions.service';

export const fromAccessCookie: JwtFromRequestFunction = (req: Request) =>
  parseCookies(req.headers.cookie)[ACCESS_COOKIE] ?? null;

/**
 * Reads the access JWT from the `__Host-luxa_at` cookie. Bearer headers are
 * accepted outside production only, for tests and local scripts. Every
 * request also checks that the session behind the token is still live, so a
 * logout or revocation takes effect immediately.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly sessions: SessionsService,
  ) {
    const extractors: JwtFromRequestFunction[] = [fromAccessCookie];
    if (configService.get<string>('NODE_ENV') !== 'production') {
      extractors.push(ExtractJwt.fromAuthHeaderAsBearerToken());
    }
    super({
      jwtFromRequest: ExtractJwt.fromExtractors(extractors),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<CurrentUserPayload> {
    if (!payload.sid || !(await this.sessions.isActive(payload.sid))) {
      throw new UnauthorizedException('Session expired or revoked');
    }
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      businessName: payload.businessName,
      businessId: payload.businessId,
      staffRole: payload.staffRole,
      permissions: payload.permissions,
      sessionId: payload.sid,
    };
  }
}
