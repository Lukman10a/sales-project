import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { TeamMember } from '../entities/team-member.entity';

@Injectable()
export class TeamMemberRepository extends Repository<TeamMember> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(TeamMember, dataSource.createEntityManager());
  }

  findByBusinessAndUser(
    businessId: string,
    userId: string,
  ): Promise<TeamMember | null> {
    return this.findOne({ where: { businessId, userId } });
  }
}
