import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import type { CurrentUserPayload } from '../common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'default-secret',
    });
  }

  validate(payload: JwtPayload): CurrentUserPayload {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      businessName: payload.businessName,
      businessId: payload.businessId,
      permissions: payload.permissions,
    };
  }
}
