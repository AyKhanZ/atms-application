import { describe, expect, it } from 'vitest';
import { parseProjectTab, projectTabQueryParam } from './details.component';

describe('parseProjectTab', () => {
  it.each(['stakeholders', 'attachments', 'history'] as const)('accepts the %s deep link', (tab) =>
    expect(parseProjectTab(tab)).toBe(tab),
  );

  it.each(['plan', 'links'])('maps the %s query parameter to groups', (tab) => {
    expect(parseProjectTab(tab)).toBe('groups');
  });

  it.each([null, '', 'unknown', 'Details'])('falls back to details for %s', (tab) =>
    expect(parseProjectTab(tab)).toBe('details'),
  );
});

describe('projectTabQueryParam', () => {
  it('keeps plan as the public query parameter for the groups tab', () => {
    expect(projectTabQueryParam('groups')).toBe('plan');
  });

  it('removes the query parameter for details', () => {
    expect(projectTabQueryParam('details')).toBeNull();
  });
});
