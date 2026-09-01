import { describe, expect, it } from 'vitest';
import { ImageUrlService } from './image-url.service';

describe('ImageUrlService', () => {
  const service = new ImageUrlService();

  it.each([
    'default-avatar.png',
    'default_avatar.png',
    '/app/images/default-avatar.png',
    'http://localhost:5000/app/images/default-avatar.png',
    'https://example.com/app/images/default-avatar.png?version=1',
  ])('does not create a URL for the default avatar %s', (value) => {
    expect(service.normalizeAvatar(value)).toBeNull();
  });

  it('normalizes a real avatar', () => {
    expect(service.normalizeAvatar('user-avatar.png')).toMatch(/\/app\/images\/user-avatar\.png$/);
  });
});
