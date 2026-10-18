import { describe, expect, it } from 'vitest';
import { listingUrl, splitLinks } from './links';

describe('splitLinks', () => {
  it('returns one text part when there is no link', () => {
    expect(splitLinks('xin chào')).toEqual([{ kind: 'text', value: 'xin chào' }]);
  });

  it('splits around links and strips trailing punctuation from the url', () => {
    expect(splitLinks('xem https://a.com/x, nhé')).toEqual([
      { kind: 'text', value: 'xem ' },
      { kind: 'link', value: 'https://a.com/x' },
      { kind: 'text', value: ', nhé' },
    ]);
  });

  it('handles a message that is only a link', () => {
    expect(splitLinks('http://b.com')).toEqual([{ kind: 'link', value: 'http://b.com' }]);
  });
});

describe('listingUrl', () => {
  it('builds an absolute listing url', () => {
    expect(listingUrl('http://localhost:3000', 'abc')).toBe('http://localhost:3000/listings/abc');
  });
});
