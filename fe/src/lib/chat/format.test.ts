import { describe, expect, it } from 'vitest';
import { formatBytes, previewText } from './format';

describe('formatBytes', () => {
  it('formats B, KB and MB', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(1572864)).toBe('1.5 MB');
  });
});

describe('previewText', () => {
  it('uses content for text', () => {
    expect(previewText({ type: 'TEXT', content: 'chào' })).toBe('chào');
  });
  it('labels media types when there is no caption', () => {
    expect(previewText({ type: 'IMAGE', content: '' })).toBe('[Ảnh]');
    expect(previewText({ type: 'FILE', content: null })).toBe('[File]');
    expect(previewText({ type: 'LOCATION', content: '' })).toBe('[Vị trí]');
  });
  it('shows the recalled label for deleted messages', () => {
    expect(previewText({ type: 'TEXT', content: null, deleted: true })).toBe('Tin nhắn đã bị thu hồi');
  });
});
