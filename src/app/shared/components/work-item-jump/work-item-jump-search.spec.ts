import { matchesJumpSearch, normalizeJumpSearch } from './work-item-jump-search';

describe('matchesJumpSearch', () => {
  const item = { id: 'a', code: '29', title: 'ticket test 18' };

  it.each([
    ['', true],
    ['29', true],
    ['#29', true],
    ['ticket', true],
    ['test 18', true],
    // The row reads "#29 ticket test 18", so people type it back verbatim.
    ['#29 ticket test 18', true],
    ['29 ticket', true],
    ['TICKET TEST', true],
    ['  #29   ticket  ', true],
    // Numbers swapped between the code and the title: every word exists somewhere, but the row
    // never reads like this, so it must not match.
    ['18 ticket test 29', false],
    ['ticket 29', false],
    ['30', false],
    ['missing', false],
  ])('matches %s -> %s', (term, expected) => {
    expect(matchesJumpSearch(item, term)).toBe(expected);
  });

  it('drops hashes and collapses whitespace', () => {
    expect(normalizeJumpSearch('  #17   Ticket ')).toBe('17 ticket');
  });
});
