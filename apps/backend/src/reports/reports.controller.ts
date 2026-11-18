import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  JwtAuthGuard,
  PermissionsGuard,
  RequirePermissions,
  CurrentUser,
  ZodValidationPipe,
  PaginationQuerySchema,
} from '../common';
import type { CurrentUserPayload, PaginationQueryDto } from '../common';
import { ReportsService } from './reports.service';
import { CreateReportDtoSchema } from './dto/create-report.dto';
import type { CreateReportDto } from './dto/create-report.dto';

@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  /**
   * Generate a report and persist its snapshot
   * POST /reports
   * Requires: reports.view_profit
   */
  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('reports.view_profit')
  @HttpCode(201)
  generate(
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(CreateReportDtoSchema)) dto: CreateReportDto,
  ) {
    return this.reportsService.generate(user, dto);
  }

  /**
   * List report history scoped to the business
   * GET /reports?page=1&limit=20
   * Requires: reports.view_profit
   */
  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('reports.view_profit')
  list(
    @CurrentUser() user: CurrentUserPayload,
    @Query(new ZodValidationPipe(PaginationQuerySchema))
    query: PaginationQueryDto,
  ) {
    return this.reportsService.list(user, query);
  }

  /**
   * Get a single report with its snapshot
   * GET /reports/:id
   * Requires: reports.view_profit
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('reports.view_profit')
  findOne(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reportsService.findOne(user, id);
  }

  /**
   * Delete a report
   * DELETE /reports/:id
   * Requires: reports.view_profit
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('reports.view_profit')
  @HttpCode(204)
  remove(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reportsService.remove(user, id);
  }
}
