import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InsightsService } from '../insights.service';
import { NotificationsRepository } from '../../notifications/notifications.repository';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class InsightsDigestService {
  constructor(
    private readonly insightsService: InsightsService,
    private readonly notificationsRepository: NotificationsRepository,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron(process.env.AI_INSIGHTS_DIGEST_CRON ?? '0 7 * * *')
  async handleDigest(): Promise<void> {
    const businessIds = await this.notificationsRepository.findAllBusinessIds();
    for (const businessId of businessIds) {
      const insights = await this.insightsService.list(
        { businessId },
        { limit: 10 },
      );
      const order: Record<string, number> = { high: 3, medium: 2, low: 1 };
      const highMedium = [...insights]
        .filter((i) => i.priority === 'high' || i.priority === 'medium')
        .sort((a, b) => order[b.priority] - order[a.priority]);
      if (highMedium.length === 0) continue;
      const recipients =
        await this.notificationsRepository.findAiInsightRecipients(businessId);
      if (recipients.length === 0) continue;
      const top = highMedium[0];
      for (const userId of recipients) {
        await this.notificationsService.create({
          businessId,
          userId,
          type: 'ai',
          title: top.title,
          message: `Digest: ${top.description}`,
          metadata: { insightId: top.id, actionType: 'manage' },
        });
      }
    }
  }
}
