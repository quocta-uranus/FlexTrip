import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type GroqResponse = { choices?: Array<{ message?: { content?: string | null } }> };

/**
 * Structured-output call to Groq. Support features always have a rule-based fallback,
 * so every failure mode (no key, timeout, HTTP error, bad JSON) resolves to null.
 */
@Injectable()
export class GroqJsonService {
  private readonly logger = new Logger(GroqJsonService.name);

  constructor(private readonly config: ConfigService) {}

  async complete(input: {
    name: string;
    system: string;
    user: string;
    schema: Record<string, unknown>;
    maxTokens?: number;
  }): Promise<unknown | null> {
    const apiKey = this.config.get<string>('GROQ_API_KEY');
    if (!apiKey) return null;
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(15_000),
        body: JSON.stringify({
          model: this.config.get<string>('GROQ_MODEL', 'openai/gpt-oss-20b'),
          temperature: 0,
          max_completion_tokens: input.maxTokens ?? 600,
          reasoning_effort: 'low',
          response_format: { type: 'json_schema', json_schema: { name: input.name, strict: true, schema: input.schema } },
          messages: [
            { role: 'system', content: input.system },
            { role: 'user', content: input.user },
          ],
        }),
      });
      if (!response.ok) {
        this.logger.warn(`Groq ${input.name} failed with status ${response.status}`);
        return null;
      }
      const content = ((await response.json()) as GroqResponse).choices?.[0]?.message?.content;
      return content ? JSON.parse(content) : null;
    } catch (e) {
      this.logger.warn(`Groq ${input.name} unavailable: ${(e as Error).message}`);
      return null;
    }
  }
}
