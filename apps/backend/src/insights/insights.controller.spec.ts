import { Test } from '@nestjs/testing';
import { InsightsController } from './insights.controller';
import { InsightsService } from './insights.service';

describe('InsightsController', () => {
  let controller: InsightsController;
  let service: { list: jest.Mock; findOne: jest.Mock };

  beforeEach(async () => {
    service = {
      list: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue({}),
    };
    const moduleRef = await Test.createTestingModule({
      controllers: [InsightsController],
      providers: [{ provide: InsightsService, useValue: service }],
    }).compile();
    controller = moduleRef.get(InsightsController);
  });

  it('delegates list to service with business-scoped user and query', async () => {
    const user = { businessId: 'b1' } as never;
    const query = { limit: 10 } as never;
    service.list.mockResolvedValue([{ id: 'restock:p1' }]);
    await expect(controller.list(user, query)).resolves.toEqual([
      { id: 'restock:p1' },
    ]);
    expect(service.list).toHaveBeenCalledWith(user, query);
  });

  it('delegates findOne to service', async () => {
    service.findOne.mockResolvedValue({ id: 'restock:p1' });
    await expect(
      controller.findOne({ businessId: 'b1' } as never, 'restock:p1'),
    ).resolves.toEqual({
      id: 'restock:p1',
    });
    expect(service.findOne).toHaveBeenCalledWith(
      { businessId: 'b1' },
      'restock:p1',
    );
  });
});
