/**
 * Validates a return URL taken from `history.state` before navigating to it.
 *
 * Navigation state is attacker-influencable in principle (it survives history entries the user
 * can be steered to), so a raw string from it must never be handed to `navigateByUrl`. Only
 * in-app project routes are accepted; anything else falls back to the caller's default.
 *
 * Rejects protocol-relative values such as `//evil.com`, which would otherwise be treated as an
 * absolute URL by the browser.
 */
export function projectNavigationUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  if (value.startsWith('//')) return null;

  return value === '/projects' || value.startsWith('/projects?') || value.startsWith('/projects/')
    ? value
    : null;
}
