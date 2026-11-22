import { RedisConnection } from '../common/redis/redis';
import { Module } from '@nestjs/common';
import {
  JwtModule,
  type JwtModuleOptions,
  type JwtSignOptions,
} from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { UsersRepository } from './users.repository';
import { TeamMemberRepository } from './team-members.repository';
import { User } from '../entities/user.entity';
import { Session } from '../entities/session.entity';
import { AuthToken } from '../entities/auth-token.entity';
import { AuthTokensRepository } from './auth-tokens.repository';
import { AuthTokensService } from './auth-tokens.service';
import { AccountService } from './account.service';
import { SessionsRepository } from './sessions.repository';
import { SessionsService } from './sessions.service';
import {
  MemoryPrincipalCache,
  PRINCIPAL_CACHE,
  RedisPrincipalCache,
  PrincipalService,
} from './principal.service';
import { TwoFactorBackupCode } from '../entities/two-factor-backup-code.entity';
import { BackupCodesRepository } from './two-factor/backup-codes.repository';
import { TwoFactorService } from './two-factor/two-factor.service';
import { TwoFactorController } from './two-factor/two-factor.controller';
import {
  SECRET_BOX,
  SecretBox,
  parseEncryptionKey,
} from '../common/crypto/secret-box';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Session, AuthToken, TwoFactorBackupCode]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): JwtModuleOptions => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.getOrThrow<string>(
            'JWT_EXPIRES_IN',
          ) as JwtSignOptions['expiresIn'],
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    UsersRepository,
    TeamMemberRepository,
    SessionsRepository,
    SessionsService,
    AuthTokensRepository,
    AuthTokensService,
    AccountService,
    BackupCodesRepository,
    TwoFactorService,
    PrincipalService,
    {
      provide: PRINCIPAL_CACHE,
      inject: [RedisConnection],
      useFactory: (redis: RedisConnection) =>
        redis.client
          ? new RedisPrincipalCache(redis.client)
          : new MemoryPrincipalCache(),
    },
    {
      provide: SECRET_BOX,
      useFactory: (config: ConfigService) =>
        new SecretBox(
          parseEncryptionKey(config.getOrThrow<string>('ENCRYPTION_KEY')),
        ),
      inject: [ConfigService],
    },
  ],
  controllers: [AuthController, TwoFactorController],
  exports: [
    AuthService,
    JwtModule,
    UsersRepository,
    SessionsService,
    PrincipalService,
  ],
})
export class AuthModule {}
