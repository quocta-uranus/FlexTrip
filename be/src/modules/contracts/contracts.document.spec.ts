import {
  buildContractDocument, canonicalJson, ContractDocumentParams, hashContent, renderDocumentText, signatureProblem,
} from './contracts.document';

const base = (): ContractDocumentParams => ({
  number: '000012/2026-HĐTB',
  issuedAt: new Date('2026-11-18T03:00:00Z'),
  provider: { name: 'Nguyễn Văn A', displayName: 'Shop Lều Đà Lạt', email: 'a@x.vn', phone: '0901234567', address: '12 Trần Phú, Đà Lạt', bankAccount: 'VCB 0011223344' },
  traveler: { name: 'Trần Thị B', email: 'b@x.vn', phone: null, address: null, idType: 'NATIONAL_ID', idLast4: '4567' },
  listing: {
    title: 'Lều 4 người', category: 'CAMPING', location: 'Đà Lạt', marketValue: 3_000_000, conditionNote: 'Mới 90%',
    penaltyRules: [{ item: 'Rách lều', description: 'Rách vải', minAmount: 100000, maxAmount: 300000 }],
  },
  booking: {
    quantity: 1, startDate: new Date('2026-11-20'), endDate: new Date('2026-11-22'), rentalDays: 3,
    unitPrice: 150000, totalPrice: 450000, depositAmount: 135000, discountAmount: 0, depositPercent: 30,
    deliveryMethod: 'PICKUP',
  },
});

const text = (p = base()) => renderDocumentText(buildContractDocument(p));

describe('buildContractDocument', () => {
  it('fills the values from the booking and writes amounts in words', () => {
    const t = text();
    expect(t).toContain('Số: 000012/2026-HĐTB');
    expect(t).toContain('ngày 18 tháng 11 năm 2026');
    expect(t).toContain('150.000 VNĐ/ngày');
    expect(t).toContain('450.000 VNĐ (Bằng chữ: Bốn trăm năm mươi nghìn đồng)');
    expect(t).toContain('135.000 VNĐ (Bằng chữ: Một trăm ba mươi lăm nghìn đồng)');
    expect(t).toContain('315.000 VNĐ (Bằng chữ: Ba trăm mười lăm nghìn đồng)');
    expect(t).toContain('20/11/2026');
    expect(t).toContain('22/11/2026');
    expect(t).toContain('3 ngày');
  });

  it('never leaves placeholders or empty values', () => {
    const t = text();
    for (const bad of ['....', 'undefined', 'null', 'NaN', '[object']) expect(t).not.toContain(bad);
    expect(t).not.toMatch(/^- [^:\n]+: *$/m);
  });

  it('omits party lines the project does not have instead of printing blanks', () => {
    const t = text();
    expect(t).toContain('4 số cuối: 4567');
    const traveler = buildContractDocument(base()).parties[1].rows.map(([k]) => k);
    expect(traveler).not.toContain('Điện thoại');
    expect(traveler).not.toContain('Địa chỉ');
    const bare = base();
    bare.provider = { name: 'A', email: 'a@x.vn' };
    const rows = buildContractDocument(bare).parties[0].rows.map(([k]) => k);
    expect(rows).toEqual(['Tên cá nhân/cửa hàng', 'Email']);
  });

  it('prints the provider penalty table and market value only when present', () => {
    expect(text()).toContain('100.000 – 300.000');
    expect(text()).toContain('3.000.000 VNĐ');
    const none = base();
    none.listing.penaltyRules = [];
    none.listing.marketValue = null;
    none.listing.conditionNote = null;
    const t = text(none);
    expect(t).not.toContain('Rách lều');
    expect(t).not.toContain('Giá trị thị trường');
    expect(t).not.toContain('Tình trạng Thiết bị do Bên A khai báo');
    expect(t).toContain('theo thiệt hại thực tế có bằng chứng');
  });

  it('shows the voucher discount and the reduced remaining amount', () => {
    const p = base();
    p.booking.discountAmount = 20000;
    expect(text(p)).toContain('295.000 VNĐ (Bằng chữ: Hai trăm chín mươi lăm nghìn đồng)');
  });

  it('uses the delivery address for delivery and the pickup address otherwise', () => {
    const p = base();
    p.booking.deliveryMethod = 'DELIVERY';
    p.booking.deliveryAddress = '5 Lê Lợi, Huế';
    expect(text(p)).toContain('Giao tận nơi tại địa chỉ: 5 Lê Lợi, Huế');
    expect(text()).toContain('Nhận và trả tại: 12 Trần Phú, Đà Lạt');
  });

  it('does not state numbers the system has no rule for', () => {
    const t = text();
    for (const bad of ['150%', 'phí phạt trễ', 'VNĐ/giờ', '48 giờ', '3 ngày làm việc']) expect(t).not.toContain(bad);
  });

  it('matches the refund policy implemented in RefundService', () => {
    const t = text();
    expect(t).toContain('hơn 7 ngày được hoàn 100%');
    expect(t).toContain('từ 4 đến 7 ngày được hoàn phần tiền thuê đã thanh toán, không hoàn khoản đặt cọc');
    expect(t).toContain('3 ngày trở xuống');
  });

  it('omits the contract number line in a preview', () => {
    const p = base();
    p.number = null;
    expect(text(p)).not.toContain('Số:');
  });
});

describe('hashContent', () => {
  it('is stable regardless of key order (JSONB reorders keys)', () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: [1, { z: 1, y: 2 }] } })).toBe(canonicalJson({ a: { c: [1, { y: 2, z: 1 }], d: 2 }, b: 1 }));
    const doc = buildContractDocument(base());
    expect(hashContent(doc)).toBe(hashContent(JSON.parse(JSON.stringify(doc))));
  });

  it('changes when the content changes', () => {
    const a = hashContent(buildContractDocument(base()));
    const p = base();
    p.booking.totalPrice = 451000;
    expect(hashContent(buildContractDocument(p))).not.toBe(a);
  });
});

describe('signatureProblem', () => {
  const png = (bytes: number) =>
    `data:image/png;base64,${Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(bytes, 7)]).toString('base64')}`;

  it('accepts a PNG of reasonable size', () => {
    expect(signatureProblem(png(3000))).toBeNull();
  });

  it('rejects other formats, tiny and oversized images, and non-strings', () => {
    expect(signatureProblem('data:image/jpeg;base64,AAAA')).not.toBeNull();
    expect(signatureProblem(`data:image/png;base64,${Buffer.alloc(3000, 1).toString('base64')}`)).not.toBeNull();
    expect(signatureProblem(png(100))).not.toBeNull();
    expect(signatureProblem(png(200_000))).not.toBeNull();
    expect(signatureProblem(undefined)).not.toBeNull();
    expect(signatureProblem('data:image/png;base64,@@@')).not.toBeNull();
  });
});
