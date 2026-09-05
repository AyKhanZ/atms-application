import { parseTicketTab, ticketHasTasks, ticketTabQueryParam } from './ticket-details.component';

describe('TicketDetailsComponent navigation helpers', () => {
  it.each([
    [null, 'details'],
    ['details', 'details'],
    ['tasks', 'tasks'],
    ['attachments', 'attachments'],
    ['history', 'history'],
    ['unknown', 'details'],
  ] as const)('parses %s as %s', (value, expected) => {
    expect(parseTicketTab(value)).toBe(expected);
  });

  it('omits the default details tab from the query string', () => {
    expect(ticketTabQueryParam('details')).toBeNull();
    expect(ticketTabQueryParam('tasks')).toBe('tasks');
  });

  it.each([
    [undefined, false],
    [0, false],
    [1, true],
  ] as const)(
    'reports whether a ticket contains tasks for count %s',
    (totalTaskCount, expected) => {
      expect(ticketHasTasks({ totalTaskCount })).toBe(expected);
    },
  );
});
