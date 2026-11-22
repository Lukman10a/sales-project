import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisConnection } from '../common/redis/redis';
import { JobRegistry } from './job-registry';
import { JOB_QUEUE } from './job-queue';
import { JobsRuntime } from './jobs-runtime';
import { processRole } from './queues';

/** Background jobs (T39): queues, the handler registry and the worker. */
@Global()
@Module({
  providers: [
    JobRegistry,
    {
      provide: JobsRuntime,
      inject: [JobRegistry, RedisConnection, ConfigService],
      useFactory: (
        registry: JobRegistry,
        redis: RedisConnection,
        config: ConfigService,
      ) =>
        new JobsRuntime({
          registry,
          connection: redis.client,
          role: processRole(),
          nodeEnv: config.get<string>('NODE_ENV'),
        }),
    },
    {
      provide: JOB_QUEUE,
      inject: [JobsRuntime],
      useFactory: (runtime: JobsRuntime) => runtime.queue,
    },
  ],
  exports: [JobRegistry, JOB_QUEUE],
})
export class JobsModule {}
