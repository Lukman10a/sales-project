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
  StreamableFile,
  BadRequestException,
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
import {
  AdjustStockDtoSchema,
  RestockDtoSchema,
  StockHistoryQuerySchema,
} from './dto/stock.dto';
import type {
  AdjustStockDto,
  RestockDto,
  StockHistoryQuery,
} from './dto/stock.dto';
import {
  IMPORT_MAX_BYTES,
  importTemplate,
  type ImportFile,
} from './product-import';
import type { CreateInventoryDto } from './dto/create-inventory.dto';
import type { UpdateInventoryDto } from './dto/update-inventory.dto';
import type { QueryInventoryDto } from './dto/query-inventory.dto';

const importUpload = FileInterceptor('file', {
  limits: { fileSize: IMPORT_MAX_BYTES, files: 1 },
});

function requireFile(file: ImportFile | undefined): ImportFile {
  if (!file) throw new BadRequestException('Choose a CSV or Excel file');
  return file;
}

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
   * The business's categories
   * GET /inventory/categories
   */
  @Get('categories')
  @UseGuards(JwtAuthGuard)
  categories(@CurrentUser() user: CurrentUserPayload) {
    return this.inventoryService.categories(user);
  }

  /**
   * The import template (.xlsx)
   * GET /inventory/import/template
   */
  @Get('import/template')
  @UseGuards(JwtAuthGuard)
  async importTemplate() {
    return new StreamableFile(await importTemplate(), {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: 'attachment; filename="luxa-products-template.xlsx"',
    });
  }

  /**
   * Dry run of a CSV/XLSX import: per-row verdicts, nothing written
   * POST /inventory/import/preview
   * Requires: products.edit_price (imports set prices)
   */
  @Post('import/preview')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('products.edit_price')
  @UseInterceptors(importUpload)
  @HttpCode(200)
  previewImport(
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() file?: ImportFile,
  ) {
    return this.inventoryService.previewImport(user, requireFile(file));
  }

  /**
   * Applies the same file's valid rows in one transaction
   * POST /inventory/import/confirm
   * Requires: products.edit_price
   */
  @Post('import/confirm')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('products.edit_price')
  @UseInterceptors(importUpload)
  @HttpCode(200)
  confirmImport(
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() file?: ImportFile,
  ) {
    return this.inventoryService.confirmImport(user, requireFile(file));
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
   * Requires: products.edit_price or products.restock; anything beyond the
   * reorder point and supplier needs products.edit_price (checked in the
   * service). Stock changes go through restock/adjust.
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
   * Stock received
   * POST /inventory/:id/restock
   * Requires: products.restock
   */
  @Post(':id/restock')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('products.restock')
  @HttpCode(200)
  restock(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(RestockDtoSchema)) dto: RestockDto,
  ) {
    return this.inventoryService.restock(user, id, dto);
  }

  /**
   * Stock correction (plus or minus) with a reason
   * POST /inventory/:id/adjust
   * Requires: products.restock
   */
  @Post(':id/adjust')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('products.restock')
  @HttpCode(200)
  adjust(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(AdjustStockDtoSchema)) dto: AdjustStockDto,
  ) {
    return this.inventoryService.adjust(user, id, dto);
  }

  /**
   * The product's stock movements, newest first
   * GET /inventory/:id/movements
   */
  @Get(':id/movements')
  @UseGuards(JwtAuthGuard)
  movements(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Query(new ZodValidationPipe(StockHistoryQuerySchema))
    query: StockHistoryQuery,
  ) {
    return this.inventoryService.history(user, id, query.limit);
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
}
