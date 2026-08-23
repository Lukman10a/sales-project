import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { TeamMember } from '../entities/team-member.entity';
import { TeamController } from './team.controller';
import { TeamActivityController } from './team-activity.controller';
import { TeamService } from './team.service';
import { TeamActivityService } from './team-activity.service';
import { TeamRepository } from './team.repository';
import { TeamActivityRepository } from './team-activity.repository';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([TeamMember])],
  controllers: [TeamActivityController, TeamController],
  providers: [
    TeamService,
    TeamActivityService,
    TeamRepository,
    TeamActivityRepository,
  ],
  exports: [TeamService],
})
export class TeamModule {}
