import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  NoopInsightProvider,
  OpenAiCompatibleInsightProvider,
} from './insight-llm.provider';

@Module({
  providers: [
    {
      provide: 'INSIGHT_LLM_PROVIDER',
      useFactory: (config: ConfigService) => {
        const enabled = config.get<string>('AI_INSIGHTS_ENABLED') === 'true';
        if (!enabled) return new NoopInsightProvider();
        const apiKey = config.get<string>('AI_PROVIDER_API_KEY');
        const model = config.get<string>('AI_MODEL') ?? 'gpt-4o-mini';
        const baseURL = config.get<string>('AI_BASE_URL') || undefined;
        if (!apiKey) return new NoopInsightProvider();
        const client = new OpenAI({ apiKey, baseURL });
        return new OpenAiCompatibleInsightProvider(client as never, model);
      },
      inject: [ConfigService],
    },
  ],
  exports: ['INSIGHT_LLM_PROVIDER'],
})
export class InsightLlmModule {}
