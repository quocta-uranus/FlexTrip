import { moderateReviewWithRules } from '../review-moderation.rules';

describe('REVIEW-01 moderation rules', () => {
  it('publishes normal comments', () => {
    expect(
      moderateReviewWithRules('Sản phẩm sạch sẽ và chủ shop hỗ trợ rất tốt.'),
    ).toEqual({
      flagged: false,
      spamDetected: false,
      spamScore: 0,
      toxicityDetected: false,
      toxicityScore: 0,
      reasons: [],
    });
  });

  it.each([
    ['Người bán là đồ lừa đảo, không nên thuê', 'ngôn từ công kích'],
    ['Xem http://spam.test và https://spam2.test ngay', 'nhiều đường dẫn'],
    ['Quá tệeeeeeeeeeeee', 'ký tự lặp lại'],
    [
      'spam spam spam spam spam spam spam spam spam spam spam spam',
      'bị lặp lại',
    ],
  ])('flags deterministic abuse: %s', (comment, reason) => {
    expect(moderateReviewWithRules(comment)).toMatchObject({ flagged: true });
    expect(moderateReviewWithRules(comment).reasons.join(' ')).toContain(
      reason,
    );
  });

  it.each([
    'aaaaaaaaaaaaaaaaaaaa đây là nội dung spam thử nghiệm',
    'spam spam spam spam spam spam spam spam spam spam spam spam',
    'Xem http://spam.test và https://spam2.test ngay',
  ])('assigns a spam floor to deterministic spam: %s', (comment) => {
    expect(moderateReviewWithRules(comment)).toMatchObject({
      flagged: true,
      spamDetected: true,
      spamScore: 80,
    });
  });

  it.each([
    'shop như cặc, đụ mẹ',
    'SHOP NHƯ CẶC, ĐỤ MẸ',
    'shop như c ặ c, đ ụ  m ẹ',
    'dịch vụ như c.*ặ.*c',
  ])('detects high-confidence Vietnamese toxicity: %s', (comment) => {
    expect(moderateReviewWithRules(comment)).toMatchObject({
      flagged: true,
      toxicityDetected: true,
      toxicityScore: 80,
    });
  });

  it.each([
    'Chiếc lồng đèn này hoạt động tốt.',
    'Tôi đang học cách làm đồ thủ công.',
    'Dịch vụ chưa tốt nhưng nhân viên vẫn lịch sự.',
  ])('does not match innocent substrings: %s', (comment) => {
    expect(moderateReviewWithRules(comment).toxicityDetected).toBe(false);
  });
});
