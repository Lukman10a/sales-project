import { Logger, type OnApplicationShutdown } from '@nestjs/common';
import Redis from 'ioredis';

/** Every key this app writes starts with this, so a shared Redis stays tidy. */
export const KEY_PREFIX = 'luxa:';

/**
 * The shared Redis connection, or none when REDIS_URL is unset (local
 * development and tests). Every Redis-backed piece has an in-process
 * fallback, so the app runs without it on a single instance.
 */
export class RedisConnection implements OnApplicationShutdown {
  private readonly logger = new Logger('Redis');

  constructor(readonly client: Redis | null) {
    client?.on('error', (err: Error) =>
      this.logger.error(`Redis error: ${err.message}`),
    );
  }

  static fromUrl(url: string | undefined): RedisConnection {
    // BullMQ needs maxRetriesPerRequest: null on connections it blocks on.
    return new RedisConnection(
      url ? new Redis(url, { maxRetriesPerRequest: null }) : null,
    );
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.client && this.client.status !== 'end') await this.client.quit();
  }
}
