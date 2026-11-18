const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
const SCALE = ['', 'nghìn', 'triệu'];

// Nhóm ba chữ số. `full` = đọc cả "không trăm" khi trăm bằng 0 (nhóm thấp hơn một nhóm cao khác 0), theo cách đọc chuẩn trong văn bản.
function readTriple(n: number, full: boolean): string {
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const u = n % 10;
  const out: string[] = [];

  if (h > 0 || full) out.push(`${DIGITS[h]} trăm`);

  if (t === 0) {
    if (u > 0 && (h > 0 || full)) out.push('lẻ');
  } else if (t === 1) {
    out.push('mười');
  } else {
    out.push(`${DIGITS[t]} mươi`);
  }

  if (u > 0) {
    if (u === 1 && t >= 2) out.push('mốt');
    else if (u === 5 && t >= 1) out.push('lăm');
    else out.push(DIGITS[u]);
  }
  return out.join(' ');
}

function readBelowBillion(n: number, full: boolean): string {
  const groups = [Math.floor(n / 1_000_000) % 1000, Math.floor(n / 1000) % 1000, n % 1000];
  const parts: string[] = [];
  let seenNonZero = false;
  groups.forEach((g, i) => {
    if (g === 0) return;
    const scale = SCALE[2 - i];
    parts.push(`${readTriple(g, seenNonZero || full)}${scale ? ` ${scale}` : ''}`);
    seenNonZero = true;
  });
  return parts.join(' ');
}

/** 1500000 → "một triệu năm trăm nghìn". Chỉ nhận số nguyên không âm, làm tròn phần thập phân. */
export function numberToVietnameseWords(value: number): string {
  if (!Number.isFinite(value) || value < 0) throw new RangeError('Số tiền không hợp lệ');
  const n = Math.round(value);
  if (n === 0) return DIGITS[0];
  if (n > Number.MAX_SAFE_INTEGER) throw new RangeError('Số tiền quá lớn');

  const billions = Math.floor(n / 1_000_000_000);
  const rest = n % 1_000_000_000;
  const parts: string[] = [];
  if (billions > 0) parts.push(`${numberToVietnameseWords(billions)} tỷ`);
  if (rest > 0) parts.push(readBelowBillion(rest, billions > 0));
  return parts.join(' ');
}

/** 1500000 → "Một triệu năm trăm nghìn đồng" */
export function moneyInWords(value: number): string {
  const words = `${numberToVietnameseWords(value)} đồng`;
  return words.charAt(0).toUpperCase() + words.slice(1);
}
