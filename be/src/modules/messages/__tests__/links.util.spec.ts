import { extractLinks, listingIdFromUrl } from '../links.util';

describe('extractLinks', () => {
  it('returns [] when there is no url', () => {
    expect(extractLinks('xin chào')).toEqual([]);
  });

  it('extracts urls and strips trailing punctuation', () => {
    expect(extractLinks('xem https://a.com/x, và http://b.com.')).toEqual([
      'https://a.com/x',
      'http://b.com',
    ]);
  });

  it('dedupes', () => {
    expect(extractLinks('https://a.com https://a.com')).toEqual(['https://a.com']);
  });

  it('caps at 10 links', () => {
    const text = Array.from({ length: 12 }, (_, i) => `https://a.com/${i}`).join(' ');
    expect(extractLinks(text)).toHaveLength(10);
  });
});

describe('listingIdFromUrl', () => {
  const origins = ['http://localhost:3000'];

  it('matches an internal listing link', () => {
    expect(listingIdFromUrl('http://localhost:3000/listings/abc123', origins)).toBe('abc123');
  });

  it('accepts a trailing slash', () => {
    expect(listingIdFromUrl('http://localhost:3000/listings/abc123/', origins)).toBe('abc123');
  });

  it('rejects other origins', () => {
    expect(listingIdFromUrl('https://evil.example/listings/abc123', origins)).toBeNull();
  });

  it('rejects nested paths', () => {
    expect(listingIdFromUrl('http://localhost:3000/listings/abc123/edit', origins)).toBeNull();
  });

  it('rejects garbage', () => {
    expect(listingIdFromUrl('not a url', origins)).toBeNull();
  });
});
