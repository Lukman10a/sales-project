import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { RateLimitGuard } from '../guards/rate-limit.guard';
import { MemoryRateLimitStore, RATE_LIMIT_STORE } from './rate-limit.store';

/** Global rate limiting: GLOBAL_RULE on every route plus @RateLimit rules. */
@Global()
@Module({
  providers: [
    { provide: RATE_LIMIT_STORE, useValue: new MemoryRateLimitStore() },
    RateLimitGuard,
    { provide: APP_GUARD, useExisting: RateLimitGuard },
  ],
  exports: [RATE_LIMIT_STORE, RateLimitGuard],
})
export class RateLimitModule {}
