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
  UseInterceptors,
  UploadedFile,
  HttpCode,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  JwtAuthGuard,
  PermissionsGuard,
  RequirePermissions,
  CurrentUser,
  ZodValidationPipe,
} from '../common';
import type { CurrentUserPayload } from '../common';
import { InventoryService } from './inventory.service';
import { CreateInventoryDtoSchema } from './dto/create-inventory.dto';
import { UpdateInventoryDtoSchema } from './dto/update-inventory.dto';
import { QueryInventoryDtoSchema } from './dto/query-inventory.dto';
import { DecrementInventoryDtoSchema } from './dto/decrement-inventory.dto';
import type { CreateInventoryDto } from './dto/create-inventory.dto';
import type { UpdateInventoryDto } from './dto/update-inventory.dto';
import type { QueryInventoryDto } from './dto/query-inventory.dto';
import type { DecrementInventoryDto } from './dto/decrement-inventory.dto';

@Controller('inventory')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  /**
   * List inventory with pagination, category/status/search filter, and sort
   * GET /inventory
   * Requires: membership of the business
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  list(
    @CurrentUser() user: CurrentUserPayload,
    @Query(new ZodValidationPipe(QueryInventoryDtoSchema))
    query: QueryInventoryDto,
  ) {
    return this.inventoryService.list(user, query);
  }

  /**
   * Get single product by ID (must match businessId)
   * GET /inventory/:id
   * Requires: Bearer token
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.inventoryService.findOne(user, id);
  }

  /**
   * Create product (auto-calculates initial status)
   * POST /inventory
   * Requires: products.edit_price (a new product sets its prices)
   */
  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('products.edit_price')
  @HttpCode(201)
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(CreateInventoryDtoSchema))
    createInventoryDto: CreateInventoryDto,
  ) {
    return this.inventoryService.create(user, createInventoryDto);
  }

  /**
   * Update product & recalculate status
   * PATCH /inventory/:id
   * Requires: products.edit_price or products.restock; price fields need
   * products.edit_price (checked in the service)
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('products.edit_price', 'products.restock')
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateInventoryDtoSchema))
    updateInventoryDto: UpdateInventoryDto,
  ) {
    return this.inventoryService.update(user, id, updateInventoryDto);
  }

  /**
   * Confirm receipt of an inventory entry.
   * POST /inventory/:id/confirm
   * Requires: products.restock (role rules enforced in service: owner
   * confirms any; manager confirms others' entries; cashier confirms own)
   */
  @Post(':id/confirm')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('products.restock')
  @HttpCode(200)
  confirm(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.inventoryService.confirm(user, id);
  }

  /**
   * Delete product
   * DELETE /inventory/:id
   * Requires: products.delete
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('products.delete')
  remove(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.inventoryService.remove(user, id);
  }

  /**
   * Reduce stock; emits inventory.low-stock if low
   * POST /inventory/:id/decrement
   * Requires: sales.record
   */
  @Post(':id/decrement')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('sales.record')
  @HttpCode(200)
  decrement(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(DecrementInventoryDtoSchema))
    decrementInventoryDto: DecrementInventoryDto,
  ) {
    return this.inventoryService.decrement(user, id, decrementInventoryDto);
  }

  /**
   * Parse CSV/JSON file and batch create/update items
   * POST /inventory/bulk-import
   * Requires: products.edit_price (imports set prices)
   */
  @Post('bulk-import')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('products.edit_price')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(200)
  bulkImport(
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() file: { buffer: Buffer; mimetype: string },
  ) {
    if (!file) {
      return this.inventoryService.bulkImport(user, {
        buffer: Buffer.alloc(0),
        mimetype: '',
      });
    }
    return this.inventoryService.bulkImport(user, file);
  }
}
