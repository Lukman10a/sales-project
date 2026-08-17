import { Test, TestingModule } from '@nestjs/testing';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { JwtAuthGuard, PermissionsGuard, RolesGuard } from '../common';

describe('SalesController', () => {
  let controller: SalesController;
  let salesService: {
    create: jest.Mock;
    list: jest.Mock;
    findOne: jest.Mock;
    refund: jest.Mock;
    createHeld: jest.Mock;
    listHeld: jest.Mock;
    removeHeld: jest.Mock;
  };

  const currentUser = {
    id: 'u1',
    email: 'owner@luxa.com',
    role: 'owner',
    businessName: 'LUXA',
    businessId: 'b1',
  };

  beforeEach(async () => {
    salesService = {
      create: jest.fn(),
      list: jest.fn(),
      findOne: jest.fn(),
      refund: jest.fn(),
      createHeld: jest.fn(),
      listHeld: jest.fn(),
      removeHeld: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SalesController],
      providers: [{ provide: SalesService, useValue: salesService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(SalesController);
  });

  it('delegates create to the service', async () => {
    const dto = {
      items: [{ productId: 'p1', quantity: 2, price: 50 }],
      paymentMethod: 'cash' as const,
    };
    salesService.create.mockResolvedValue({ id: 's1' });

    await expect(controller.create(currentUser, dto)).resolves.toEqual({
      id: 's1',
    });
    expect(salesService.create).toHaveBeenCalledWith(currentUser, dto);
  });

  it('delegates list to the service', async () => {
    const query = { page: 1, limit: 20 };
    salesService.list.mockResolvedValue({ data: [], pagination: {} });

    await expect(controller.list(currentUser, query)).resolves.toEqual({
      data: [],
      pagination: {},
    });
    expect(salesService.list).toHaveBeenCalledWith(currentUser, query);
  });

  it('delegates findOne to the service', async () => {
    salesService.findOne.mockResolvedValue({ id: 's1' });

    await expect(controller.findOne(currentUser, 's1')).resolves.toEqual({
      id: 's1',
    });
    expect(salesService.findOne).toHaveBeenCalledWith(currentUser, 's1');
  });

  it('delegates refund to the service', async () => {
    const dto = { refundAmount: 100, refundReason: 'reason' };
    salesService.refund.mockResolvedValue({ id: 's1', status: 'refunded' });

    await expect(controller.refund(currentUser, 's1', dto)).resolves.toEqual({
      id: 's1',
      status: 'refunded',
    });
    expect(salesService.refund).toHaveBeenCalledWith(currentUser, 's1', dto);
  });

  it('delegates createHeld to the service', async () => {
    const dto = {
      customerName: 'Customer',
      items: [{ productId: 'p1', quantity: 1, price: 10 }],
      paymentMethod: 'cash' as const,
    };
    salesService.createHeld.mockResolvedValue({ id: 'h1' });

    await expect(controller.createHeld(currentUser, dto)).resolves.toEqual({
      id: 'h1',
    });
    expect(salesService.createHeld).toHaveBeenCalledWith(currentUser, dto);
  });

  it('delegates listHeld to the service', async () => {
    salesService.listHeld.mockResolvedValue([{ id: 'h1' }]);

    await expect(controller.listHeld(currentUser)).resolves.toEqual([
      { id: 'h1' },
    ]);
    expect(salesService.listHeld).toHaveBeenCalledWith(currentUser);
  });

  it('delegates removeHeld to the service', async () => {
    salesService.removeHeld.mockResolvedValue({ message: 'removed' });

    await expect(controller.removeHeld(currentUser, 'h1')).resolves.toEqual({
      message: 'removed',
    });
    expect(salesService.removeHeld).toHaveBeenCalledWith(currentUser, 'h1');
  });
});
