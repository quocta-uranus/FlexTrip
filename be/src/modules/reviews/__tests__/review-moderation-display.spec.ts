import { toVietnameseDisplayReasons } from '../review-moderation-display';

describe('REVIEW-03 Vietnamese moderation reasons', () => {
  it('removes source prefixes, translates and deduplicates equivalent reasons', () => {
    expect(
      toVietnameseDisplayReasons([
        '[RULE] Nội dung chứa từ ngữ tục tĩu hoặc xúc phạm.',
        '[AI] Content contains profanity and offensive language.',
        '[AI] User used profanity in the comment.',
      ]),
    ).toEqual(['Nội dung chứa từ ngữ tục tĩu hoặc xúc phạm.']);
  });

  it('translates common legacy AI reasons', () => {
    expect(
      toVietnameseDisplayReasons([
        '[AI] Comment contains repetitive characters indicating spam.',
        '[AI] Content is generic and lacks meaningful information.',
      ]),
    ).toEqual([
      'Nội dung chứa ký tự lặp lại bất thường.',
      'Nội dung chung chung hoặc không phản ánh trải nghiệm thuê thực tế.',
    ]);
  });

  it('uses a safe Vietnamese fallback for unknown English reasons', () => {
    expect(
      toVietnameseDisplayReasons([
        '[AI] The review violates an unknown moderation signal.',
      ]),
    ).toEqual(['AI phát hiện nội dung có dấu hiệu vi phạm.']);
  });

  it('does not turn an English denial into an accusation', () => {
    expect(
      toVietnameseDisplayReasons([
        '[AI] The review is positive and contains no violation.',
        '[AI] The comment appears safe and genuine.',
        '[AI] Content does not violate any policy.',
      ]),
    ).toEqual([]);
  });

  it('drops an unknown English reason instead of accusing a clean review', () => {
    expect(
      toVietnameseDisplayReasons(
        ['[AI] The review mentions the tent and the delivery.'],
        { clean: true },
      ),
    ).toEqual([]);
  });

  it('still translates a known reason when the scores are clean', () => {
    expect(
      toVietnameseDisplayReasons(
        ['[RULE] Nội dung chứa nhiều đường dẫn.'],
        { clean: true },
      ),
    ).toEqual(['Nội dung chứa nhiều đường dẫn.']);
  });

  it('keeps existing Vietnamese reasons and rejects invalid values', () => {
    expect(
      toVietnameseDisplayReasons([
        '[RULE] Nội dung chứa nhiều đường dẫn.',
        null,
        123,
      ]),
    ).toEqual(['Nội dung chứa nhiều đường dẫn.']);
  });
});
