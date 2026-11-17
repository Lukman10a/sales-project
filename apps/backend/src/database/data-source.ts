import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { DataSource } from 'typeorm';
import { validateEnv } from '../config/env.schema';
import { buildDataSourceOptions } from './database.config';

// TypeORM CLI entry point (migration:run / generate / revert, db:seed).
// Real environment variables win over .env, as in the app.
if (existsSync('.env')) process.loadEnvFile('.env');

export default new DataSource(buildDataSourceOptions(validateEnv(process.env)));
