// history.state can be steered by an attacker, never pass it raw to navigateByUrl
// only in-app project routes, //evil.com is rejected
export function projectNavigationUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  if (value.startsWith('//')) return null;

  return value === '/projects' || value.startsWith('/projects?') || value.startsWith('/projects/')
    ? value
    : null;
}
