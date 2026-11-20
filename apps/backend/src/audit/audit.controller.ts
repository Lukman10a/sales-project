import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  CurrentTenant,
  JwtAuthGuard,
  PermissionsGuard,
  RequirePermissions,
  ZodValidationPipe,
} from '../common';
import { AuditService } from './audit.service';
import { QueryAuditDtoSchema } from './dto/query-audit.dto';
import type { QueryAuditDto } from './dto/query-audit.dto';

@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  /**
   * The business audit trail, newest first, with cursor pagination.
   * GET /audit?actor=&action=&entityType=&entityId=&from=&to=&cursor=&limit=
   * Requires: staff.manage (owners hold it)
   */
  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('staff.manage')
  list(
    @CurrentTenant() businessId: string,
    @Query(new ZodValidationPipe(QueryAuditDtoSchema)) query: QueryAuditDto,
  ) {
    return this.audit.list(businessId, query);
  }
}
