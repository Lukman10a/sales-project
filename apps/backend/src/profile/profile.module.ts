import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { UserProfileRepository } from './user-profiles.repository';
import { UserProfile } from '../entities/user-profile.entity';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([UserProfile])],
  controllers: [ProfileController],
  providers: [ProfileService, UserProfileRepository],
  exports: [ProfileService],
})
export class ProfileModule {}
