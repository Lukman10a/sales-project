import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  JwtAuthGuard,
  PermissionsGuard,
  RequirePermissions,
  ZodValidationPipe,
} from '../common';
import type { CurrentUserPayload } from '../common';
import { ExpensesService } from './expenses.service';
import {
  CreateExpenseDtoSchema,
  ExpenseSummaryQuerySchema,
  QueryExpensesDtoSchema,
  UpdateExpenseDtoSchema,
} from './dto/expense.dto';
import type {
  CreateExpenseDto,
  ExpenseSummaryQuery,
  QueryExpensesDto,
  UpdateExpenseDto,
} from './dto/expense.dto';

/** Every route needs `expenses.manage` (owners and, by default, managers). */
@Controller('expenses')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  /**
   * Expenses, newest first, filtered by date range and category
   * GET /expenses?from&to&category&page&limit
   */
  @Get()
  @RequirePermissions('expenses.manage')
  list(
    @CurrentUser() user: CurrentUserPayload,
    @Query(new ZodValidationPipe(QueryExpensesDtoSchema))
    query: QueryExpensesDto,
  ) {
    return this.expensesService.list(user, query);
  }

  /**
   * Totals for a period, by category and by day or month
   * GET /expenses/summary?from&to&groupBy=day|month
   * Requires: expenses.manage or reports.view_profit
   */
  @Get('summary')
  @RequirePermissions('expenses.manage', 'reports.view_profit')
  summary(
    @CurrentUser() user: CurrentUserPayload,
    @Query(new ZodValidationPipe(ExpenseSummaryQuerySchema))
    query: ExpenseSummaryQuery,
  ) {
    return this.expensesService.summary(user.businessId, query);
  }

  /** GET /expenses/:id */
  @Get(':id')
  @RequirePermissions('expenses.manage')
  findOne(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.expensesService.findOne(user, id);
  }

  /** POST /expenses */
  @Post()
  @RequirePermissions('expenses.manage')
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(CreateExpenseDtoSchema)) dto: CreateExpenseDto,
  ) {
    return this.expensesService.create(user, dto);
  }

  /** PATCH /expenses/:id */
  @Patch(':id')
  @RequirePermissions('expenses.manage')
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateExpenseDtoSchema)) dto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(user, id, dto);
  }

  /** DELETE /expenses/:id */
  @Delete(':id')
  @RequirePermissions('expenses.manage')
  remove(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.expensesService.remove(user, id);
  }
}
