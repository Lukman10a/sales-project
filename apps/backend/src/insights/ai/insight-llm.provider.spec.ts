import {
  buildInsightPrompt,
  parseNarrativeResponse,
  NoopInsightProvider,
  OpenAiCompatibleInsightProvider,
} from './insight-llm.provider';
import type { Insight } from '../insight.types';

const baseInsight: Insight = {
  id: 'restock:p1',
  type: 'restock',
  priority: 'high',
  title: 'Restock Widget',
  description: 'Template text for widget',
  impact: 'Risk',
  action: 'Reorder',
  metrics: [
    { label: 'Days to stockout', value: '2.3d', trend: 'down' },
    { label: 'Velocity', value: '4.2/d' },
  ],
};

describe('insight-llm.provider', () => {
  describe('buildInsightPrompt', () => {
    it('builds bounded PII-free prompt from aggregated facts', () => {
      const prompt = buildInsightPrompt(baseInsight);
      expect(prompt).toContain('restock');
      expect(prompt).toContain('Days to stockout');
      expect(prompt.length).toBeLessThanOrEqual(800);
      expect(prompt).not.toContain('customer');
      expect(prompt).not.toContain('customerName');
    });

    it('does not leak raw sale rows or customer names if insight contains them', () => {
      const prompt = buildInsightPrompt(baseInsight);
      expect(prompt).not.toMatch(/PII/i);
    });
  });

  describe('parseNarrativeResponse', () => {
    it('returns trimmed content', () => {
      expect(parseNarrativeResponse('  Hello world  ', 'fallback')).toBe(
        'Hello world',
      );
    });

    it('falls back when empty', () => {
      expect(parseNarrativeResponse('', 'fallback')).toBe('fallback');
      expect(parseNarrativeResponse(null, 'fallback')).toBe('fallback');
    });

    it('bounds to 500 chars', () => {
      const long = 'a'.repeat(600);
      expect(parseNarrativeResponse(long, 'fallback').length).toBe(500);
    });
  });

  describe('NoopInsightProvider', () => {
    it('returns template text without network', async () => {
      const provider = new NoopInsightProvider();
      const map = await provider.generateNarratives([baseInsight]);
      expect(map.get(baseInsight.id)).toBe(baseInsight.description);
    });
  });

  describe('OpenAiCompatibleInsightProvider', () => {
    it('parses narrative response on success', async () => {
      const mockClient = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{ message: { content: 'AI narrative' } }],
            }),
          },
        },
      };
      const provider = new OpenAiCompatibleInsightProvider(
        mockClient,
        'gpt-4o-mini',
      );
      const map = await provider.generateNarratives([baseInsight]);
      expect(map.get(baseInsight.id)).toBe('AI narrative');
      expect(mockClient.chat.completions.create).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const arg = mockClient.chat.completions.create.mock.calls[0][0] as {
        messages: { content: string }[];
      };
      const userMsg =
        arg.messages.find((m) => m.content.includes('restock'))?.content ?? '';
      expect(userMsg).toContain('Days to stockout');
    });

    it('falls back to template on provider error', async () => {
      const mockClient = {
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue(new Error('API error')),
          },
        },
      };
      const provider = new OpenAiCompatibleInsightProvider(
        mockClient,
        'gpt-4o-mini',
      );
      const map = await provider.generateNarratives([baseInsight]);
      expect(map.get(baseInsight.id)).toBe(baseInsight.description);
      expect(mockClient.chat.completions.create).toHaveBeenCalledTimes(2);
    });

    it('retries once on timeout then falls back', async () => {
      const mockClient = {
        chat: {
          completions: {
            create: jest
              .fn()
              .mockRejectedValueOnce(new Error('timeout'))
              .mockResolvedValue({
                choices: [{ message: { content: 'recovered' } }],
              }),
          },
        },
      };
      const provider = new OpenAiCompatibleInsightProvider(
        mockClient,
        'gpt-4o-mini',
      );
      const map = await provider.generateNarratives([baseInsight]);
      expect(map.get(baseInsight.id)).toBe('recovered');
      expect(mockClient.chat.completions.create).toHaveBeenCalledTimes(2);
    });
  });
});
