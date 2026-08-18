import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UserProfile } from '../entities/user-profile.entity';

@Injectable()
export class UserProfileRepository extends Repository<UserProfile> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(UserProfile, dataSource.createEntityManager());
  }

  async findByUserId(userId: string): Promise<UserProfile | null> {
    return this.findOne({ where: { userId } });
  }
}
