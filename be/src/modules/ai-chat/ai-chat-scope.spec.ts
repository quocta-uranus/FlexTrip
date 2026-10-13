import {
  hasFlexTripIntent,
  hasTravelDetailIntent,
  isTravelPlanningConversation,
} from './ai-chat-scope';

describe('AI chat FlexTrip intent detection', () => {
  it.each([
    'Tôi đi du lịch gia đình tại Đà Nẵng, đề xuất các món đồ cần thuê',
    'Gợi ý sản phẩm phù hợp cho chuyến đi biển 3 ngày',
    'Tôi thanh toán booking như thế nào?',
    'Làm sao tìm kiếm đồ dùng cho trẻ nhỏ?',
    'Dự báo thời tiết Đà Nẵng vài ngày tới',
  ])('accepts a FlexTrip request: %s', (message) => {
    expect(hasFlexTripIntent(message)).toBe(true);
  });

  it('does not force an unrelated request into FlexTrip scope', () => {
    expect(hasFlexTripIntent('Viết giúp tôi một bài thơ về mùa thu')).toBe(
      false,
    );
  });

  it('recognizes a natural travel-planning conversation', () => {
    expect(
      isTravelPlanningConversation('Gia đình 2 vợ chồng và 1 con đi Đà Nẵng'),
    ).toBe(true);
  });

  it('does not treat a payment support request as travel planning', () => {
    expect(
      isTravelPlanningConversation('Tôi thanh toán booking như thế nào?'),
    ).toBe(false);
  });

  it.each([
    'Tôi có đi leo núi',
    'Chuyến đi 3 ngày',
    'Ngân sách 500 nghìn',
    'Có một trẻ nhỏ',
  ])('recognizes a travel-planning detail: %s', (message) => {
    expect(hasTravelDetailIntent(message)).toBe(true);
  });
});
