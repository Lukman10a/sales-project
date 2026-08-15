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
   * GET /api/inventory
   * Requires: view-inventory OR view-products
   */
  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('view-inventory', 'view-products')
  list(
    @CurrentUser() user: CurrentUserPayload,
    @Query(new ZodValidationPipe(QueryInventoryDtoSchema))
    query: QueryInventoryDto,
  ) {
    return this.inventoryService.list(user, query);
  }

  /**
   * Get single product by ID (must match businessId)
   * GET /api/inventory/:id
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
   * POST /api/inventory
   * Requires: edit-inventory OR edit-products
   */
  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('edit-inventory', 'edit-products')
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
   * PATCH /api/inventory/:id
   * Requires: edit-inventory OR edit-products
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('edit-inventory', 'edit-products')
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateInventoryDtoSchema))
    updateInventoryDto: UpdateInventoryDto,
  ) {
    return this.inventoryService.update(user, id, updateInventoryDto);
  }

  /**
   * Delete product
   * DELETE /api/inventory/:id
   * Requires: delete-products
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('delete-products')
  remove(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.inventoryService.remove(user, id);
  }

  /**
   * Reduce stock; emits inventory.low-stock if low
   * POST /api/inventory/:id/decrement
   * Requires: record-sales
   */
  @Post(':id/decrement')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('record-sales')
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
   * POST /api/inventory/bulk-import
   * Requires: edit-inventory OR owner
   */
  @Post('bulk-import')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('edit-inventory')
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
