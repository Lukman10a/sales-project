import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TransactionalRepository } from '../common/transactions/transactions';
import { User } from '../entities/user.entity';

@Injectable()
export class UsersRepository extends TransactionalRepository<User> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(User, dataSource.createEntityManager());
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.findOne({ where: { id } });
  }

  /**
   * Records a TOTP step as used, only if it is newer than the last one. A
   * single conditional UPDATE, so one code cannot be accepted twice even by
   * two requests at once.
   */
  async claimTotpStep(userId: string, step: number): Promise<boolean> {
    const result = await this.createQueryBuilder()
      .update(User)
      .set({ twoFactorLastStep: step })
      .where('id = :userId', { userId })
      .andWhere(
        '("twoFactorLastStep" IS NULL OR "twoFactorLastStep" < :step)',
        { step },
      )
      .execute();
    return (result.affected ?? 0) === 1;
  }
}
