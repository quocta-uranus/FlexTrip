import { ContractParams, renderContract } from './contracts.templates';

const base: ContractParams = {
  contractId: 'cmcontract000000000001',
  bookingId: 'cmbooking00000QX5P42SUYDWJ',
  travelerName: 'Trần Nguyễn Đạt',
  travelerEmail: 'dat@example.com',
  providerName: 'Provider A',
  providerShopName: 'Shop A',
  listingTitle: 'Lều trại 4 người',
  listingCategory: 'CAMPING',
  listingLocation: 'Đà Nẵng',
  quantity: 1,
  startDate: new Date('2026-11-20T00:00:00Z'),
  endDate: new Date('2026-11-20T00:00:00Z'),
  rentalDays: 1,
  unitPrice: 10000,
  totalPrice: 10000,
  depositAmount: 3000,
  depositRate: 0.3,
  deliveryMethod: 'PICKUP',
  penaltyRules: [],
  isHighValue: false,
};

describe('renderContract', () => {
  it('labels the booking code in Vietnamese', () => {
    const text = renderContract(base);
    expect(text).toContain('Mã đơn thuê');
    expect(text).not.toContain('Mã booking');
  });

  it('adds the voucher discount and the reduced remaining amount to section III', () => {
    const text = renderContract({ ...base, discountAmount: 2000 });
    expect(text).toContain('Giảm giá (voucher) : -2.000đ');
    expect(text).toContain('Tiền thuê sau giảm : 8.000đ');
    expect(text).toContain('Còn lại sau cọc    : 5.000đ');
  });

  it('leaves section III unchanged when there is no discount', () => {
    const text = renderContract({ ...base, discountAmount: 0 });
    expect(text).not.toContain('Giảm giá');
    expect(text).not.toContain('Còn lại sau cọc');
  });
});
