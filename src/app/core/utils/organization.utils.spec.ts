import { organizationInitials } from './organization.utils';

describe('organizationInitials', () => {
  it.each([
    ['Apple', 'A'],
    ['Kapital Bank', 'KB'],
    ['BAIM - Biznesin Avtomatlaşdırma və İnkişaf Mərkəzi', 'B-'],
    ['  port   of baku ', 'PO'],
    ['', 'O'],
    [null, 'O'],
    [undefined, 'O'],
  ])('%j -> %s', (title, expected) => {
    expect(organizationInitials(title)).toBe(expected);
  });
});
