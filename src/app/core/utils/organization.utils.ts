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
