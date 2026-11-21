import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard, PermissionsGuard, PERMISSIONS_KEY } from '../common';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import {
  CreateExpenseDtoSchema,
  ExpenseSummaryQuerySchema,
  QueryExpensesDtoSchema,
  UpdateExpenseDtoSchema,
} from './dto/expense.dto';

describe('ExpensesController', () => {
  let controller: ExpensesController;
  const service = {
    list: jest.fn(),
    summary: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const user = {
    id: 'u1',
    email: 'owner@luxa.com',
    role: 'owner' as const,
    permissions: [],
    maxDiscountPercent: 100,
    businessName: 'LUXA',
    businessId: 'b1',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [ExpensesController],
      providers: [{ provide: ExpensesService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get(ExpensesController);
  });

  it('delegates every route to the service with the caller', async () => {
    const dto = { category: 'fuel' as const, amount: 100 };
    await controller.create(user, dto);
    expect(service.create).toHaveBeenCalledWith(user, dto);

    await controller.update(user, 'e1', { amount: 5 });
    expect(service.update).toHaveBeenCalledWith(user, 'e1', { amount: 5 });

    await controller.remove(user, 'e1');
    expect(service.remove).toHaveBeenCalledWith(user, 'e1');

    await controller.findOne(user, 'e1');
    expect(service.findOne).toHaveBeenCalledWith(user, 'e1');

    const query = { page: 1, limit: 20 };
    await controller.list(user, query);
    expect(service.list).toHaveBeenCalledWith(user, query);

    const range = {
      from: '2026-11-01',
      to: '2026-11-30',
      groupBy: 'month' as const,
    };
    await controller.summary(user, range);
    expect(service.summary).toHaveBeenCalledWith('b1', range);
  });

  it('needs expenses.manage, and the summary also opens to profit viewers', () => {
    const reflector = new Reflector();
    const needs = (name: keyof ExpensesController) =>
      reflector.get<string[]>(
        PERMISSIONS_KEY,
        Object.getOwnPropertyDescriptor(ExpensesController.prototype, name)!
          .value as () => unknown,
      );
    for (const name of [
      'list',
      'findOne',
      'create',
      'update',
      'remove',
    ] as const) {
      expect(needs(name)).toEqual(['expenses.manage']);
    }
    expect(needs('summary')).toEqual([
      'expenses.manage',
      'reports.view_profit',
    ]);
  });
});

describe('expense DTOs', () => {
  it('accepts a naira amount with kobo and rejects bad ones', () => {
    expect(
      CreateExpenseDtoSchema.parse({ category: 'rent', amount: '1500.50' })
        .amount,
    ).toBe(1500.5);
    for (const amount of [0, -5, 1.234]) {
      expect(
        CreateExpenseDtoSchema.safeParse({ category: 'rent', amount }).success,
      ).toBe(false);
    }
  });

  it('rejects unknown categories, impossible dates and extra fields', () => {
    const ok = { category: 'fuel', amount: 1 };
    expect(
      CreateExpenseDtoSchema.safeParse({ ...ok, category: 'fun' }).success,
    ).toBe(false);
    expect(
      CreateExpenseDtoSchema.safeParse({ ...ok, date: '2026-02-30' }).success,
    ).toBe(false);
    expect(
      CreateExpenseDtoSchema.safeParse({ ...ok, businessId: 'x' }).success,
    ).toBe(false);
    expect(
      CreateExpenseDtoSchema.safeParse({ ...ok, date: '2028-02-29' }).success,
    ).toBe(true);
  });

  it('needs something to change on update', () => {
    expect(UpdateExpenseDtoSchema.safeParse({}).success).toBe(false);
    expect(UpdateExpenseDtoSchema.safeParse({ note: null }).success).toBe(true);
  });

  it('checks date ranges', () => {
    expect(
      QueryExpensesDtoSchema.safeParse({ from: '2026-12-01', to: '2026-11-01' })
        .success,
    ).toBe(false);
    expect(
      ExpenseSummaryQuerySchema.safeParse({ from: '2026-11-01' }).success,
    ).toBe(false);
    expect(
      ExpenseSummaryQuerySchema.parse({ from: '2026-11-01', to: '2026-11-30' })
        .groupBy,
    ).toBe('month');
  });
});
