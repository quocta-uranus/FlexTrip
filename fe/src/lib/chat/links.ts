const URL_RE = /https?:\/\/[^\s<>"']+/gi;

export type TextPart = { kind: 'text' | 'link'; value: string };

export function splitLinks(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const match of text.matchAll(URL_RE)) {
    const url = match[0].replace(/[.,;:!?]+$/, '');
    const start = match.index ?? 0;
    if (start > last) parts.push({ kind: 'text', value: text.slice(last, start) });
    parts.push({ kind: 'link', value: url });
    last = start + url.length;
  }
  if (last < text.length) parts.push({ kind: 'text', value: text.slice(last) });
  return parts;
}

export const listingUrl = (origin: string, id: string) => `${origin}/listings/${id}`;
