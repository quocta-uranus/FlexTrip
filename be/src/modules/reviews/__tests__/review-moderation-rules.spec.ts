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
    'Cảm ơn bạn, nhưng người như bạn đúng là đồ ngu dốt, đừng thuê nữa.',
    'Đồ ngu, thuê rồi còn than',
    'Chủ shop khốn nạn',
    'Nhân viên ngu ngốc quá',
    'ĐỒ CHÓ',
  ])('flags insults that name or attack a person: %s', (comment) => {
    const result = moderateReviewWithRules(comment);
    expect(result.flagged).toBe(true);
    expect(result.reasons.join(' ')).toContain('ngôn từ công kích');
  });

  it.each([
    'Mua đồ nguyên bộ gồm lều, túi ngủ và đèn.',
    'Đồ nguy hiểm đã được shop lưu ý trước khi thuê.',
    'Túi ngủ ấm, ngủ rất ngon.',
    'Con chó của tôi rất thích chiếc lều này.',
    'Điên đảo vì giá rẻ, tôi sẽ thuê lại.',
  ])('does not flag innocent text near insult terms: %s', (comment) => {
    expect(moderateReviewWithRules(comment).flagged).toBe(false);
  });

  describe('expanded dictionary', () => {
    it.each([
      'Chủ shop địt mẹ lừa người ta',
      'đéo bao giờ thuê lại',
      'Dịch vụ như buồi',
      'vãi lồn thật sự',
      'ĐM shop này',
      'shop dit me',
      'Lều rách vcl',
      'This shop is shit',
      'Fucking terrible service',
      'what a bitch',
    ])('flags profanity: %s', (comment) => {
      expect(moderateReviewWithRules(comment)).toMatchObject({
        flagged: true,
        toxicityDetected: true,
        toxicityScore: 80,
      });
    });

    it.each([
      'đụụụụ mẹ shop',
      'địt  mẹ',
      'v c l',
      'sh1t service',
      'đ​ụ m​ẹ',
      'Chủ shop d1t m3',
      // Cyrillic "с" (U+0441) in place of the Latin "c"
      'shop như сặс',
    ])('sees through disguises: %s', (comment) => {
      expect(moderateReviewWithRules(comment).flagged).toBe(true);
    });

    it.each([
      'Chủ shop thằng chó',
      'Nhân viên mất dạy',
      'Đúng là đồ khốn',
      'Bọn vô học',
      'You are an idiot',
      'chu shop ngu ngoc',
      'thang khon nan',
      'Đồ điên',
    ])('flags insults: %s', (comment) => {
      const result = moderateReviewWithRules(comment);
      expect(result.flagged).toBe(true);
      expect(result.reasons.join(' ')).toContain('ngôn từ công kích');
    });

    it.each([
      'Tao giết mày nếu không hoàn tiền',
      'Tôi sẽ đốt shop của bạn',
      'giết cả nhà',
    ])('flags threats: %s', (comment) => {
      const result = moderateReviewWithRules(comment);
      expect(result).toMatchObject({ flagged: true, toxicityDetected: true });
      expect(result.reasons.join(' ')).toContain('đe dọa');
    });

    it.each([
      'Liên hệ 0901234567 để thuê rẻ hơn',
      'Gọi 090 123 4567 giảm giá',
      'Zalo 0901.234.567',
      'Số của mình +84901234567',
      'Đặt thẳng tại zalo.me/shopgiare cho rẻ',
      'xem t.me/channel',
    ])('flags contact info as spam: %s', (comment) => {
      expect(moderateReviewWithRules(comment)).toMatchObject({
        flagged: true,
        spamDetected: true,
        spamScore: 80,
      });
    });

    // Rental vocabulary and everyday phrases that sit next to a listed term.
    it.each([
      'Đồ ngủ ấm, túi ngủ rất dày.',
      'do ngu am ap, tui ngu rat day',
      'Thang gấp cho thuê tiện lợi.',
      'thang cho thue rat chac chan',
      'Đồ cho thuê sạch sẽ.',
      'do cho thue sach se, chu shop nhiet tinh',
      'Đồ điện đi kèm đầy đủ.',
      'Mua đồ nguyên bộ gồm lều, túi ngủ và đèn.',
      'Con nguyên liệu nấu ăn mang theo đủ dùng.',
      'Đánh giá buổi sáng rất tốt, dùng cả buổi không hỏng.',
      'Đĩa và bát đi kèm đầy đủ.',
      'Anh bán hàng giết thời gian chờ mình rất vui.',
      'Muỗi nhiều, phải đập chết cả chục con.',
      'Lần đầu thuê, đeo balo đi cả ngày không mỏi.',
      'Dụng cụ nấu ăn rất tốt, shipper thân thiện.',
      'Giá 1.500.000 cho 2 ngày, cọc 3.000.000 đồng.',
      'Mã đơn 20261109, nhận lúc 09:30 ngày 09/11/2026.',
      'Shop trả lời nhanh qua zalo, rất nhiệt tình.',
      'Shitake nấu cùng lẩu rất ngon.',
    ])('does not flag rental vocabulary: %s', (comment) => {
      expect(moderateReviewWithRules(comment)).toMatchObject({
        flagged: false,
        reasons: [],
      });
    });
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

  it.each([
    'shop nhu dit me',
    'DCM shop lua dao',
    'shop d1t m3 qua te',
    'vcl, dich vu te qua',
    'd.i.t m.e',
  ])('detects toxicity typed without diacritics or with leetspeak: %s', (c) => {
    expect(moderateReviewWithRules(c)).toMatchObject({
      flagged: true,
      toxicityDetected: true,
    });
  });

  it.each([
    'Phòng lớn, các tiện nghi đều tốt, đi lại thuận tiện.',
    'Giá 5 sao, 3 người ở thoải mái, 1 đêm rất đáng tiền!',
    'Shop ho tro nhiet tinh, xe sach se va dung gio.',
  ])('does not over-flag normal text: %s', (comment) => {
    expect(moderateReviewWithRules(comment).toxicityDetected).toBe(false);
  });
});
