import { reconcileAiAnalysis } from '../review-analysis-reconcile';
import { toVietnameseDisplayReasons } from '../review-moderation-display';

describe('reasons that deny a violation', () => {
  it('does not treat "no spam or insult" as a signal when the score is high', () => {
    const result = reconcileAiAnalysis({
      spamScore: 80,
      toxicityScore: 10,
      reasons: ['Không có nội dung xúc phạm, spam hay dấu hiệu giả mạo.'],
    });
    expect(result).toEqual({
      inconsistentToxicity: false,
      inconsistentSpam: false,
    });
  });

  it('still trusts a reason that names spam without denying it', () => {
    expect(
      reconcileAiAnalysis({
        spamScore: 0,
        toxicityScore: 0,
        reasons: ['Nội dung quảng cáo, có dấu hiệu spam'],
      }).inconsistentSpam,
    ).toBe(true);
  });

  it('hides a denial from the admin instead of showing it as an accusation', () => {
    expect(
      toVietnameseDisplayReasons([
        '[AI] Không có nội dung xúc phạm, spam hay dấu hiệu giả mạo.',
        '[RULE] Nội dung chứa số điện thoại hoặc liên kết liên hệ.',
      ]),
    ).toEqual(['Nội dung chứa số điện thoại hoặc liên kết liên hệ.']);
  });
});
