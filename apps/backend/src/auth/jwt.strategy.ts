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
import { PrincipalService } from './principal.service';

export const fromAccessCookie: JwtFromRequestFunction = (req: Request) =>
  parseCookies(req.headers.cookie)[ACCESS_COOKIE] ?? null;

/**
 * Reads the access JWT from the `__Host-luxa_at` cookie. Bearer headers are
 * accepted outside production only, for tests and local scripts. Every
 * request also checks that the session behind the token is still live and
 * resolves the user's current permissions, so a logout, a revocation or a
 * permission change takes effect on the next request.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly sessions: SessionsService,
    private readonly principals: PrincipalService,
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
    if (
      !payload.sid ||
      !payload.bid ||
      !(await this.sessions.isActive(payload.sid))
    ) {
      throw new UnauthorizedException('Session expired or revoked');
    }
    const principal = await this.principals.resolve(payload.sub, payload.bid);
    if (!principal) throw new UnauthorizedException('Access revoked');
    return { ...principal, sessionId: payload.sid };
  }
}
