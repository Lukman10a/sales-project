import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisConnection } from './redis';

@Global()
@Module({
  providers: [
    {
      provide: RedisConnection,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        RedisConnection.fromUrl(config.get<string>('REDIS_URL')),
    },
  ],
  exports: [RedisConnection],
})
export class RedisModule {}
