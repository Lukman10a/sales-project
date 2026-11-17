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
import { SessionsRepository } from './sessions.repository';
import { SessionsService } from './sessions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Session]),
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
  ],
  controllers: [AuthController],
  exports: [AuthService, JwtModule, UsersRepository, SessionsService],
})
export class AuthModule {}
