export function normalizeVi(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{M}/gu, '') // combining diacritics after NFD
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}
