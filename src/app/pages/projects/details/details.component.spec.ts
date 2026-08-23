import { describe, expect, it } from 'vitest';
import { parseProjectTab } from './details.component';

describe('parseProjectTab', () => {
  it.each(['stakeholders', 'links', 'attachments', 'history'] as const)(
    'accepts the %s deep link',
    (tab) => expect(parseProjectTab(tab)).toBe(tab),
  );

  it.each([null, '', 'unknown', 'Details'])(
    'falls back to details for %s',
    (tab) => expect(parseProjectTab(tab)).toBe('details'),
  );
});
