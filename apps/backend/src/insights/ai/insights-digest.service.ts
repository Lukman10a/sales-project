import { Injectable, type OnModuleInit } from '@nestjs/common';
import { JobRegistry } from '../../jobs/job-registry';
import { InsightsService } from '../insights.service';
import { selectTopAiInsight } from '../insight.types';
import { NotificationsRepository } from '../../notifications/notifications.repository';
import { NotificationsService } from '../../notifications/notifications.service';

/** Daily AI digest notification: a `digest` job, scheduled at 07:00 Lagos. */
@Injectable()
export class InsightsDigestService implements OnModuleInit {
  constructor(
    private readonly insightsService: InsightsService,
    private readonly notificationsRepository: NotificationsRepository,
    private readonly notificationsService: NotificationsService,
    private readonly jobs: JobRegistry,
  ) {}

  onModuleInit(): void {
    this.jobs.handle('digest', 'ai-digest', () => this.handleDigest());
    this.jobs.schedule(
      'digest',
      'ai-digest',
      process.env.AI_INSIGHTS_DIGEST_CRON ?? '0 7 * * *',
    );
  }

  async handleDigest(): Promise<void> {
    const businessIds = await this.notificationsRepository.findAllBusinessIds();
    for (const businessId of businessIds) {
      const insights = await this.insightsService.list(
        { businessId },
        { limit: 10 },
      );
      const top = selectTopAiInsight(insights);
      if (!top) continue;
      const recipients =
        await this.notificationsRepository.findAiInsightRecipients(businessId);
      if (recipients.length === 0) continue;
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
