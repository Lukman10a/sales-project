import type { ConfigModuleOptions } from '@nestjs/config';
import { validateEnv } from './env.schema';

/** Shared by AppModule and the boot-failure e2e test. */
export const configModuleOptions: ConfigModuleOptions = {
  isGlobal: true,
  envFilePath: '.env',
  // Tests must never pick up a developer's local .env.
  ignoreEnvFile: process.env.NODE_ENV === 'test',
  validate: validateEnv,
};
