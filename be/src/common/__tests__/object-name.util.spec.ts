import { uniqueObjectName } from '../object-name.util';

describe('uniqueObjectName', () => {
  it('differs for identical buffers created in the same tick and keeps the extension', () => {
    const names = Array.from({ length: 50 }, () => uniqueObjectName('png'));
    expect(new Set(names).size).toBe(50);
    names.forEach((n) => expect(n).toMatch(/\.png$/));
  });
});
