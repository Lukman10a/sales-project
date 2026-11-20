import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  ParseUUIDPipe,
  Headers,
} from '@nestjs/common';
import {
  JwtAuthGuard,
  PermissionsGuard,
  RequirePermissions,
  CurrentUser,
  ZodValidationPipe,
} from '../common';
import type { CurrentUserPayload } from '../common';
import { SalesService } from './sales.service';
import { CreateSaleDtoSchema } from './dto/create-sale.dto';
import { QuerySalesDtoSchema } from './dto/query-sales.dto';
import { RefundSaleDtoSchema } from './dto/refund-sale.dto';
import { CreateHeldTransactionDtoSchema } from './dto/create-held-transaction.dto';
import { UpdateSalesSettingsDtoSchema } from './dto/sales-settings.dto';
import type { UpdateSalesSettingsDto } from './dto/sales-settings.dto';
import { requireIdempotencyKey } from './idempotency';
import type { CreateSaleDto } from './dto/create-sale.dto';
import type { QuerySalesDto } from './dto/query-sales.dto';
import type { RefundSaleDto } from './dto/refund-sale.dto';
import type { CreateHeldTransactionDto } from './dto/create-held-transaction.dto';

@Controller('sales')
export class SalesController {
  constructor(private salesService: SalesService) {}

  /**
   * Record a new sale atomically, priced by the server, decrementing stock.
   * POST /sales with an `Idempotency-Key` header; a repeat returns the
   * original sale.
   * Requires: sales.record
   */
  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('sales.record')
  @HttpCode(201)
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body(new ZodValidationPipe(CreateSaleDtoSchema))
    createSaleDto: CreateSaleDto,
  ) {
    const key = requireIdempotencyKey(idempotencyKey);
    return this.salesService.create(user, createSaleDto, key);
  }

  /**
   * Business-wide sale settings (VAT)
   * GET /sales/settings
   * Requires: sales.record
   */
  @Get('settings')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('sales.record')
  settings(@CurrentUser() user: CurrentUserPayload) {
    return this.salesService.settings(user);
  }

  /**
   * Turn VAT on or off for the business
   * PATCH /sales/settings
   * Requires: settings.manage
   */
  @Patch('settings')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('settings.manage')
  updateSettings(
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(UpdateSalesSettingsDtoSchema))
    dto: UpdateSalesSettingsDto,
  ) {
    return this.salesService.updateSettings(user, dto);
  }

  /**
   * List sales history with date/payment/status filters and summary
   * GET /sales
   * Requires: sales.record
   */
  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('sales.record')
  list(
    @CurrentUser() user: CurrentUserPayload,
    @Query(new ZodValidationPipe(QuerySalesDtoSchema)) query: QuerySalesDto,
  ) {
    return this.salesService.list(user, query);
  }

  /**
   * List active held transactions
   * GET /sales/held
   * Requires: sales.record
   */
  @Get('held')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('sales.record')
  listHeld(@CurrentUser() user: CurrentUserPayload) {
    return this.salesService.listHeld(user);
  }

  /**
   * Create a held/paused transaction (24h lifespan)
   * POST /sales/held
   * Requires: sales.record
   */
  @Post('held')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('sales.record')
  @HttpCode(201)
  createHeld(
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(CreateHeldTransactionDtoSchema))
    createHeldDto: CreateHeldTransactionDto,
  ) {
    return this.salesService.createHeld(user, createHeldDto);
  }

  /**
   * Remove/resolve a held transaction
   * DELETE /sales/held/:id
   * Requires: sales.record
   */
  @Delete('held/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('sales.record')
  removeHeld(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.salesService.removeHeld(user, id);
  }

  /**
   * Get a single sale with its line items
   * GET /sales/:id
   * Requires: sales.record
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('sales.record')
  findOne(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.salesService.findOne(user, id);
  }

  /**
   * Process a refund and restore inventory atomically
   * PATCH /sales/:id/refund
   * Requires: sales.refund
   */
  @Patch(':id/refund')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('sales.refund')
  refund(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(RefundSaleDtoSchema)) refundDto: RefundSaleDto,
  ) {
    return this.salesService.refund(user, id, refundDto);
  }
}
