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
    decrement: jest.Mock;
    bulkImport: jest.Mock;
    confirm: jest.Mock;
  };

  const currentUser = {
    id: 'u1',
    email: 'owner@luxa.com',
    role: 'owner',
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
      decrement: jest.fn(),
      bulkImport: jest.fn(),
      confirm: jest.fn(),
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
      wholesalePrice: 5,
      quantity: 3,
    };
    inventoryService.create.mockResolvedValue({ id: 'i1' });

    await expect(controller.create(currentUser, dto)).resolves.toEqual({
      id: 'i1',
    });
    expect(inventoryService.create).toHaveBeenCalledWith(currentUser, dto);
  });

  it('delegates update to the service', async () => {
    const dto = { quantity: 5 };
    inventoryService.update.mockResolvedValue({ id: 'i1', quantity: 5 });

    await expect(controller.update(currentUser, 'i1', dto)).resolves.toEqual({
      id: 'i1',
      quantity: 5,
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

  it('delegates decrement to the service', async () => {
    const dto = { quantity: 2 };
    inventoryService.decrement.mockResolvedValue({ id: 'i1', quantity: 8 });

    await expect(controller.decrement(currentUser, 'i1', dto)).resolves.toEqual(
      {
        id: 'i1',
        quantity: 8,
      },
    );
    expect(inventoryService.decrement).toHaveBeenCalledWith(
      currentUser,
      'i1',
      dto,
    );
  });

  it('delegates confirm to the service', async () => {
    inventoryService.confirm.mockResolvedValue({
      id: 'i1',
      confirmedBy: 'u1',
    });

    await expect(controller.confirm(currentUser, 'i1')).resolves.toEqual({
      id: 'i1',
      confirmedBy: 'u1',
    });
    expect(inventoryService.confirm).toHaveBeenCalledWith(currentUser, 'i1');
  });

  it('delegates bulkImport with the uploaded file', async () => {
    const file = { buffer: Buffer.from('[]'), mimetype: 'application/json' };
    inventoryService.bulkImport.mockResolvedValue({
      imported: 1,
      skipped: 0,
      errors: [],
    });

    await expect(controller.bulkImport(currentUser, file)).resolves.toEqual({
      imported: 1,
      skipped: 0,
      errors: [],
    });
    expect(inventoryService.bulkImport).toHaveBeenCalledWith(currentUser, file);
  });
});
