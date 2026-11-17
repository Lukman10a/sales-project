import { InsightsDigestService } from './insights-digest.service';
import { InsightsService } from '../insights.service';
import { NotificationsRepository } from '../../notifications/notifications.repository';
import { NotificationsService } from '../../notifications/notifications.service';

describe('InsightsDigestService', () => {
  let service: InsightsDigestService;
  let insightsService: { list: jest.Mock };
  let notificationsRepository: {
    findAiInsightRecipients: jest.Mock;
    findAllBusinessIds: jest.Mock;
  };
  let notificationsService: { create: jest.Mock };

  beforeEach(() => {
    insightsService = { list: jest.fn() };
    notificationsRepository = {
      findAiInsightRecipients: jest.fn(),
      findAllBusinessIds: jest.fn().mockResolvedValue(['b1']),
    };
    notificationsService = { create: jest.fn().mockResolvedValue({}) };

    service = new InsightsDigestService(
      insightsService as unknown as InsightsService,
      notificationsRepository as unknown as NotificationsRepository,
      notificationsService as unknown as NotificationsService,
    );
  });

  it('creates ai digest notification for opted-in owner/managers when high/medium insights exist', async () => {
    insightsService.list.mockResolvedValue([
      {
        id: 'restock:p1',
        type: 'restock',
        priority: 'high',
        title: 'Restock Widget',
        description: 'Widget low',
        impact: '',
        action: '',
        metrics: [],
      },
    ]);
    notificationsRepository.findAiInsightRecipients.mockResolvedValue(['u1']);

    await service.handleDigest();

    expect(notificationsService.create).toHaveBeenCalledWith({
      businessId: 'b1',
      userId: 'u1',
      type: 'ai',
      title: 'Restock Widget',
      message: expect.stringContaining('Widget low') as string,
      metadata: { insightId: 'restock:p1', actionType: 'manage' },
    });
  });

  it('does not create notification when no high/medium insights', async () => {
    insightsService.list.mockResolvedValue([
      {
        id: 'warning:p1',
        type: 'warning',
        priority: 'low',
        title: 'Slow',
        description: 'Slow mover',
        impact: '',
        action: '',
        metrics: [],
      },
    ]);
    notificationsRepository.findAiInsightRecipients.mockResolvedValue(['u1']);

    await service.handleDigest();

    expect(notificationsService.create).not.toHaveBeenCalled();
  });

  it('does not notify when no opted-in recipients', async () => {
    insightsService.list.mockResolvedValue([
      {
        id: 'restock:p1',
        type: 'restock',
        priority: 'high',
        title: 'Restock',
        description: 'Desc',
        impact: '',
        action: '',
        metrics: [],
      },
    ]);
    notificationsRepository.findAiInsightRecipients.mockResolvedValue([]);

    await service.handleDigest();

    expect(notificationsService.create).not.toHaveBeenCalled();
  });

  it('respects aiInsights preference (repository filters)', async () => {
    insightsService.list.mockResolvedValue([
      {
        id: 'restock:p1',
        type: 'restock',
        priority: 'high',
        title: 'T',
        description: 'D',
        impact: '',
        action: '',
        metrics: [],
      },
    ]);
    notificationsRepository.findAiInsightRecipients.mockResolvedValue(['u1']);

    await service.handleDigest();

    expect(notificationsService.create).toHaveBeenCalledTimes(1);
    expect(notificationsService.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1' }),
    );
  });

  it('creates digest per business', async () => {
    notificationsRepository.findAllBusinessIds.mockResolvedValue(['b1', 'b2']);
    insightsService.list
      .mockResolvedValueOnce([
        {
          id: 'restock:p1',
          type: 'restock',
          priority: 'high',
          title: 'T1',
          description: 'D1',
          impact: '',
          action: '',
          metrics: [],
        },
      ])
      .mockResolvedValueOnce([]);
    notificationsRepository.findAiInsightRecipients.mockResolvedValue(['u1']);

    await service.handleDigest();

    expect(notificationsService.create).toHaveBeenCalledTimes(1);
    expect(insightsService.list).toHaveBeenCalledWith(
      { businessId: 'b1' },
      expect.anything(),
    );
    expect(insightsService.list).toHaveBeenCalledWith(
      { businessId: 'b2' },
      expect.anything(),
    );
  });
});
