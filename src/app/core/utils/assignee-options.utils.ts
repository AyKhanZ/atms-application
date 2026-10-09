// inactive people can't be picked, the one already on the item stays or the form would show nobody
export function withoutInactive<T extends { id: string; isActive?: boolean }>(
  people: readonly T[],
  keptId: string | null | undefined,
): T[] {
  return people.filter((person) => person.isActive !== false || person.id === keptId);
}
