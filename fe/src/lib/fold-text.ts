// Diacritic-insensitive, so typing "da" still finds "Đà Nẵng".
export const foldText = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase();
