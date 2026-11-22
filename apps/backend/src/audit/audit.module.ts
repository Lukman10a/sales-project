import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditEvent } from '../entities/audit-event.entity';
import { TransactionRunner } from '../common/transactions/transactions';
import { AuditController } from './audit.controller';
import { AuditRepository } from './audit.repository';
import { AuditService } from './audit.service';

/** Global: every module that changes data records what it did. */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditEvent])],
  controllers: [AuditController],
  providers: [AuditService, AuditRepository, TransactionRunner],
  exports: [AuditService, TransactionRunner],
})
export class AuditModule {}
