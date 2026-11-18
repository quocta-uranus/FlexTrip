import { moneyInWords, numberToVietnameseWords as w } from './vietnamese-number.util';

describe('numberToVietnameseWords', () => {
  it.each([
    [0, 'không'],
    [1, 'một'],
    [5, 'năm'],
    [10, 'mười'],
    [11, 'mười một'],
    [15, 'mười lăm'],
    [20, 'hai mươi'],
    [21, 'hai mươi mốt'],
    [25, 'hai mươi lăm'],
    [99, 'chín mươi chín'],
    [100, 'một trăm'],
    [101, 'một trăm lẻ một'],
    [105, 'một trăm lẻ năm'],
    [110, 'một trăm mười'],
    [115, 'một trăm mười lăm'],
    [999, 'chín trăm chín mươi chín'],
    [1000, 'một nghìn'],
    [1001, 'một nghìn không trăm lẻ một'],
    [20000, 'hai mươi nghìn'],
    [135000, 'một trăm ba mươi lăm nghìn'],
    [150000, 'một trăm năm mươi nghìn'],
    [315000, 'ba trăm mười lăm nghìn'],
    [450000, 'bốn trăm năm mươi nghìn'],
    [1500000, 'một triệu năm trăm nghìn'],
    [1000001, 'một triệu không trăm lẻ một'],
    [1001000, 'một triệu không trăm lẻ một nghìn'],
    [1010000, 'một triệu không trăm mười nghìn'],
    [10000000, 'mười triệu'],
    [12345678, 'mười hai triệu ba trăm bốn mươi lăm nghìn sáu trăm bảy mươi tám'],
    [2000000000, 'hai tỷ'],
    [2000000001, 'hai tỷ không trăm lẻ một'],
    [1000000000000, 'một nghìn tỷ'],
  ])('%i → %s', (n, expected) => {
    expect(w(n)).toBe(expected);
  });

  it('rounds decimals and rejects invalid values', () => {
    expect(w(1499.6)).toBe('một nghìn năm trăm');
    expect(() => w(-1)).toThrow(RangeError);
    expect(() => w(NaN)).toThrow(RangeError);
  });
});

describe('moneyInWords', () => {
  it('capitalizes and appends "đồng"', () => {
    expect(moneyInWords(315000)).toBe('Ba trăm mười lăm nghìn đồng');
    expect(moneyInWords(0)).toBe('Không đồng');
  });
});
