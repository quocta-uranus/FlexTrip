import { ConfigService } from '@nestjs/config';
import { jest } from '@jest/globals';
import {
  GroqRateLimitError,
  ReviewAiAnalyzerService,
} from '../review-ai-analyzer.service';

describe('REVIEW-03 AI output validation', () => {
  const config = {
    get: jest.fn((key: string, fallback?: string) =>
      key === 'GROQ_API_KEY' ? 'test-key' : fallback,
    ),
  } as unknown as ConfigService;
  const service = new ReviewAiAnalyzerService(config);

  function response(value: unknown) {
    global.fetch = jest.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: JSON.stringify(value) } }],
        }),
    } as Response);
  }

  it('accepts a strict structured result', async () => {
    response({
      sentiment: 'POSITIVE',
      spamScore: 10,
      toxicityScore: 0,
      suspicionScore: 20,
      reasons: ['Nội dung tự nhiên'],
    });
    await expect(
      service.analyze({
        reviewId: 'review-safe-log',
        comment: 'Sản phẩm rất tốt.',
        rating: 5,
      }),
    ).resolves.toMatchObject({ sentiment: 'POSITIVE', spamScore: 10 });
    const request = (global.fetch as jest.MockedFunction<typeof fetch>).mock
      .calls[0][1];
    const body = JSON.parse(String(request?.body)) as Record<string, unknown>;
    expect(body).toMatchObject({ max_completion_tokens: 400 });
    expect(body).not.toHaveProperty('max_tokens');
    expect(body.response_format).toMatchObject({
      type: 'json_schema',
      json_schema: {
        name: 'review_moderation',
        strict: true,
        schema: { additionalProperties: false },
      },
    });
  });

  it('uses retry-after when Groq rate limits the request', async () => {
    global.fetch = jest.fn<typeof fetch>().mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers({ 'retry-after': '3' }),
      json: () => Promise.resolve({ error: { message: 'rate limited' } }),
    } as Response);

    await expect(
      service.analyze({ comment: 'Review hợp lệ đủ dài.', rating: 4 }),
    ).rejects.toMatchObject<Partial<GroqRateLimitError>>({
      name: 'GroqRateLimitError',
      retryAfterMs: 3_000,
    });
  });

  it.each([
    {
      sentiment: 'UNKNOWN',
      spamScore: 1,
      toxicityScore: 1,
      suspicionScore: 1,
      reasons: [],
    },
    {
      sentiment: 'NEUTRAL',
      spamScore: '70',
      toxicityScore: 1,
      suspicionScore: 1,
      reasons: [],
    },
    {
      sentiment: 'NEUTRAL',
      spamScore: 70.5,
      toxicityScore: 1,
      suspicionScore: 1,
      reasons: [],
    },
    {
      sentiment: 'NEUTRAL',
      spamScore: 101,
      toxicityScore: 1,
      suspicionScore: 1,
      reasons: [],
    },
    {
      sentiment: 'NEUTRAL',
      spamScore: 1,
      toxicityScore: 1,
      suspicionScore: 1,
      reasons: 'bad',
    },
  ])('rejects invalid AI output %#', async (value) => {
    response(value);
    await expect(
      service.analyze({ comment: 'Review hợp lệ đủ dài.', rating: 4 }),
    ).rejects.toThrow();
  });

  it('rejects malformed JSON', async () => {
    global.fetch = jest.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ choices: [{ message: { content: '{invalid' } }] }),
    } as Response);
    await expect(
      service.analyze({ comment: 'Review hợp lệ đủ dài.', rating: 4 }),
    ).rejects.toThrow('invalid JSON');
  });

  it('classifies a Groq 400 response as invalid AI output', async () => {
    global.fetch = jest.fn<typeof fetch>().mockResolvedValue({
      ok: false,
      status: 400,
      headers: new Headers(),
      json: () =>
        Promise.resolve({ error: { message: 'json_validate_failed' } }),
    } as Response);
    await expect(
      service.analyze({ comment: 'Review hợp lệ đủ dài.', rating: 4 }),
    ).rejects.toMatchObject({ code: 'INVALID_AI_OUTPUT', status: 400 });
  });

  it('classifies timeout and network failures without exposing details', async () => {
    const timeout = new Error('request timed out');
    timeout.name = 'TimeoutError';
    global.fetch = jest.fn<typeof fetch>().mockRejectedValueOnce(timeout);
    await expect(
      service.analyze({ comment: 'Review hợp lệ đủ dài.', rating: 4 }),
    ).rejects.toMatchObject({ code: 'TIMEOUT' });

    global.fetch = jest
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new Error('socket details must not be exposed'));
    await expect(
      service.analyze({ comment: 'Review hợp lệ đủ dài.', rating: 4 }),
    ).rejects.toMatchObject({ code: 'GROQ_UNAVAILABLE' });
  });

  it('fails closed when the API key is missing', async () => {
    const missingConfig = {
      get: jest.fn(() => undefined),
    } as unknown as ConfigService;
    await expect(
      new ReviewAiAnalyzerService(missingConfig).analyze({
        comment: 'Review hợp lệ đủ dài.',
        rating: 4,
      }),
    ).rejects.toThrow('GROQ_API_KEY');
  });
});
