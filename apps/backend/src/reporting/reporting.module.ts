import { Module } from '@nestjs/common';
import { ExpensesModule } from '../expenses/expenses.module';
import { ExpensesService } from '../expenses/expenses.service';
import { ReportingController } from './reporting.controller';
import { ReportingService } from './reporting.service';
import { ReportingRepository } from './reporting.repository';
import { ReportingListener } from './reporting.listener';
import { ReportCache } from './report-cache';

/** Dashboard and reports API v2 (T38). */
@Module({
  imports: [ExpensesModule],
  controllers: [ReportingController],
  providers: [
    ReportingRepository,
    ReportingListener,
    { provide: ReportCache, useFactory: () => new ReportCache() },
    {
      provide: ReportingService,
      inject: [ReportingRepository, ExpensesService, ReportCache],
      useFactory: (
        repo: ReportingRepository,
        expenses: ExpensesService,
        cache: ReportCache,
      ) => new ReportingService(repo, expenses, cache),
    },
  ],
})
export class ReportingModule {}
