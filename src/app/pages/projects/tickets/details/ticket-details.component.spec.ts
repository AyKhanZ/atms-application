import { parseTicketTab, ticketTabQueryParam } from './ticket-details.component';

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
});
