/** First letters of the first two words of the title, for a logo placeholder. */
export function organizationInitials(title: string | null | undefined): string {
  return (
    (title ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'O'
  );
}
