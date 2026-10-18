import { isPlainClick } from './link-click.utils';

describe('isPlainClick', () => {
  it('is a left click with no modifier', () => {
    expect(isPlainClick(new MouseEvent('click', { button: 0 }))).toBe(true);
  });

  it.each([
    ['ctrl', { ctrlKey: true }],
    ['cmd', { metaKey: true }],
    ['shift', { shiftKey: true }],
    ['alt', { altKey: true }],
    ['middle button', { button: 1 }],
  ])('is not with %s', (_name, init) => {
    expect(isPlainClick(new MouseEvent('click', { button: 0, ...init }))).toBe(false);
  });
});
