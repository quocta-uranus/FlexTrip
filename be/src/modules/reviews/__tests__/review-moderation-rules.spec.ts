import { moderateReviewWithRules } from '../review-moderation.rules';

describe('REVIEW-01 moderation rules', () => {
  it('publishes normal comments', () => {
    expect(
      moderateReviewWithRules('Sản phẩm sạch sẽ và chủ shop hỗ trợ rất tốt.'),
    ).toEqual({
      flagged: false,
      reasons: [],
    });
  });

  it.each([
    ['Người bán là đồ lừa đảo, không nên thuê', 'BLOCKED_LANGUAGE'],
    ['Xem http://spam.test và https://spam2.test ngay', 'MULTIPLE_URLS'],
    ['Quá tệeeeeeeeeeeee', 'REPEATED_CHARACTERS'],
    [
      'spam spam spam spam spam spam spam spam spam spam spam spam',
      'REPETITIVE_CONTENT',
    ],
  ])('flags deterministic abuse: %s', (comment, reason) => {
    expect(moderateReviewWithRules(comment)).toMatchObject({ flagged: true });
    expect(moderateReviewWithRules(comment).reasons).toContain(reason);
  });
});
