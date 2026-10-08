import { WorkItemJumpItem } from './work-item-jump-item';

// matches the visible row "#29 ticket test 18", not code and title apart
// apart "18 ticket test 29" matched "#29 ticket test 18"
export function matchesJumpSearch(item: WorkItemJumpItem, term: string): boolean {
  const query = normalizeJumpSearch(term);

  return !query || normalizeJumpSearch(`${item.code} ${item.title}`).includes(query);
}

// drops the # people copy from a code
export function normalizeJumpSearch(value: string): string {
  return value.toLocaleLowerCase().replace(/#/g, '').replace(/\s+/g, ' ').trim();
}
