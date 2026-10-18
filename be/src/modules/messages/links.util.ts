const URL_RE = /https?:\/\/[^\s<>"']+/gi;
const TRAILING_PUNCTUATION = /[.,;:!?]+$/;
export const MAX_LINKS = 10;

export function extractLinks(content: string): string[] {
  const found = (content.match(URL_RE) ?? []).map((u) => u.replace(TRAILING_PUNCTUATION, ''));
  return [...new Set(found)].slice(0, MAX_LINKS);
}

export function listingIdFromUrl(raw: string, allowedOrigins: string[]): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (!allowedOrigins.includes(url.origin)) return null;
  return /^\/listings\/([A-Za-z0-9_-]+)\/?$/.exec(url.pathname)?.[1] ?? null;
}

export function appOrigins(): string[] {
  const configured = (process.env.FRONTEND_URL ?? '').split(',');
  return ['http://localhost:3000', ...configured]
    .map((o) => o.trim())
    .filter(Boolean)
    .flatMap((o) => {
      try {
        return [new URL(o).origin];
      } catch {
        return [];
      }
    });
}
