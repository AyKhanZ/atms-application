export function workItemProgressBadge(
  done: number | undefined,
  total: number | undefined,
): string | undefined {
  return total ? (done ?? 0) + '/' + total : undefined;
}
