import { Test, TestingModule } from '@nestjs/testing';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard, PermissionsGuard } from '../common';

describe('InventoryController', () => {
  let controller: InventoryController;
  let inventoryService: {
    list: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    restock: jest.Mock;
    adjust: jest.Mock;
    history: jest.Mock;
    categories: jest.Mock;
    previewImport: jest.Mock;
    confirmImport: jest.Mock;
  };

  const currentUser = {
    id: 'u1',
    email: 'owner@luxa.com',
    role: 'owner' as const,
    permissions: [],
    maxDiscountPercent: 100,
    businessName: 'LUXA',
    businessId: 'b1',
  };

  beforeEach(async () => {
    inventoryService = {
      list: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      restock: jest.fn(),
      adjust: jest.fn(),
      history: jest.fn(),
      categories: jest.fn(),
      previewImport: jest.fn(),
      confirmImport: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [{ provide: InventoryService, useValue: inventoryService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(InventoryController);
  });

  it('delegates list to the service with the current user and query', async () => {
    const query = {
      page: 1,
      limit: 20,
      search: 'wid',
      category: 'tools',
      status: 'in-stock' as const,
      sort: 'name' as const,
    };
    inventoryService.list.mockResolvedValue({ data: [], pagination: {} });

    await expect(controller.list(currentUser, query)).resolves.toEqual({
      data: [],
      pagination: {},
    });
    expect(inventoryService.list).toHaveBeenCalledWith(currentUser, query);
  });

  it('delegates findOne to the service', async () => {
    inventoryService.findOne.mockResolvedValue({ id: 'i1' });

    await expect(controller.findOne(currentUser, 'i1')).resolves.toEqual({
      id: 'i1',
    });
    expect(inventoryService.findOne).toHaveBeenCalledWith(currentUser, 'i1');
  });

  it('delegates create to the service', async () => {
    const dto = {
      name: 'Widget',
      sellingPrice: 10,
      costPrice: 5,
      quantity: 3,
    };
    inventoryService.create.mockResolvedValue({ id: 'i1' });

    await expect(controller.create(currentUser, dto)).resolves.toEqual({
      id: 'i1',
    });
    expect(inventoryService.create).toHaveBeenCalledWith(currentUser, dto);
  });

  it('delegates update to the service', async () => {
    const dto = { reorderPoint: 5 };
    inventoryService.update.mockResolvedValue({ id: 'i1', reorderPoint: 5 });

    await expect(controller.update(currentUser, 'i1', dto)).resolves.toEqual({
      id: 'i1',
      reorderPoint: 5,
    });
    expect(inventoryService.update).toHaveBeenCalledWith(
      currentUser,
      'i1',
      dto,
    );
  });

  it('delegates remove to the service', async () => {
    inventoryService.remove.mockResolvedValue({ message: 'Product deleted' });

    await expect(controller.remove(currentUser, 'i1')).resolves.toEqual({
      message: 'Product deleted',
    });
    expect(inventoryService.remove).toHaveBeenCalledWith(currentUser, 'i1');
  });

  it('delegates restock and adjust to the service', async () => {
    inventoryService.restock.mockResolvedValue({ id: 'i1', quantity: 15 });
    inventoryService.adjust.mockResolvedValue({ id: 'i1', quantity: 14 });

    await expect(
      controller.restock(currentUser, 'i1', { quantity: 5 }),
    ).resolves.toEqual({ id: 'i1', quantity: 15 });
    await expect(
      controller.adjust(currentUser, 'i1', { delta: -1, reason: 'Broken' }),
    ).resolves.toEqual({ id: 'i1', quantity: 14 });
    expect(inventoryService.restock).toHaveBeenCalledWith(currentUser, 'i1', {
      quantity: 5,
    });
    expect(inventoryService.adjust).toHaveBeenCalledWith(currentUser, 'i1', {
      delta: -1,
      reason: 'Broken',
    });
  });

  it('delegates movements and categories to the service', async () => {
    inventoryService.history.mockResolvedValue([]);
    inventoryService.categories.mockResolvedValue([{ id: 'c1', name: 'A' }]);

    await controller.movements(currentUser, 'i1', { limit: 20 });
    await expect(controller.categories(currentUser)).resolves.toEqual([
      { id: 'c1', name: 'A' },
    ]);
    expect(inventoryService.history).toHaveBeenCalledWith(
      currentUser,
      'i1',
      20,
    );
  });

  it('previews and confirms an import with the uploaded file', async () => {
    const file = {
      buffer: Buffer.from('name,sellingPrice'),
      mimetype: 'text/csv',
    };
    inventoryService.previewImport.mockResolvedValue({ summary: {} });
    inventoryService.confirmImport.mockResolvedValue({ summary: {} });

    await controller.previewImport(currentUser, file);
    await controller.confirmImport(currentUser, file);

    expect(inventoryService.previewImport).toHaveBeenCalledWith(
      currentUser,
      file,
    );
    expect(inventoryService.confirmImport).toHaveBeenCalledWith(
      currentUser,
      file,
    );
  });

  it('asks for a file when none is uploaded', () => {
    expect(() => controller.previewImport(currentUser, undefined)).toThrow(
      'Choose a CSV or Excel file',
    );
  });

  it('serves the import template as an xlsx attachment', async () => {
    const file = await controller.importTemplate();
    expect(file.getHeaders()).toMatchObject({
      disposition: 'attachment; filename="luxa-products-template.xlsx"',
    });
  });
});
