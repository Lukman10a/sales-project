import type { Insight } from '../insight.types';

export interface InsightLlmProvider {
  generateNarratives(insights: Insight[]): Promise<Map<string, string>>;
}

export function buildInsightPrompt(insight: Insight): string {
  const metrics = insight.metrics
    .map((m) => `${m.label}: ${m.value}${m.trend ? ` (${m.trend})` : ''}`)
    .join('; ');
  const parts = [
    `Type: ${insight.type}`,
    `Priority: ${insight.priority}`,
    `Title: ${insight.title}`,
    `Metrics: ${metrics}`,
  ];
  const prompt = parts.join('\n');
  return prompt.slice(0, 800);
}

export function parseNarrativeResponse(
  content: string | null | undefined,
  fallback: string,
): string {
  if (!content) return fallback;
  const trimmed = content.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, 500);
}

export class NoopInsightProvider implements InsightLlmProvider {
  // eslint-disable-next-line @typescript-eslint/require-await
  async generateNarratives(insights: Insight[]): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    for (const i of insights) map.set(i.id, i.description);
    return map;
  }
}

export class OpenAiCompatibleInsightProvider implements InsightLlmProvider {
  private readonly client: {
    chat: {
      completions: {
        create: (
          args: unknown,
        ) => Promise<{ choices: { message: { content: string | null } }[] }>;
      };
    };
  };
  private readonly model: string;
  private readonly timeoutMs = 8000;

  constructor(
    openaiClient: {
      chat: {
        completions: {
          create: (
            args: unknown,
          ) => Promise<{ choices: { message: { content: string | null } }[] }>;
        };
      };
    },
    model: string,
  ) {
    this.client = openaiClient;
    this.model = model;
  }

  async generateNarratives(insights: Insight[]): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    for (const insight of insights) {
      const prompt = buildInsightPrompt(insight);
      const fallback = insight.description;
      let attempt = 0;
      let result: string | null = null;
      while (attempt < 2) {
        try {
          result = await this.withTimeout(
            this.client.chat.completions.create({
              model: this.model,
              messages: [
                {
                  role: 'system',
                  content:
                    'You are an insight narrator. Return a concise 1-2 sentence business narrative based ONLY on aggregated metrics provided. Do not invent PII.',
                },
                { role: 'user', content: prompt },
              ],
              temperature: 0.2,
              max_tokens: 120,
            }),
          ).then((r) => r.choices[0]?.message?.content ?? null);
          break;
        } catch {
          attempt += 1;
          if (attempt >= 2) result = null;
        }
      }
      map.set(insight.id, parseNarrativeResponse(result, fallback));
    }
    return map;
  }

  private async withTimeout<T>(promise: Promise<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error('LLM timeout')),
        this.timeoutMs,
      );
    });
    try {
      const res = await Promise.race([promise, timeout]);
      clearTimeout(timer!);
      return res;
    } catch (e) {
      clearTimeout(timer!);
      throw e;
    }
  }
}
