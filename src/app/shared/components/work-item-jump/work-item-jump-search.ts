import { WorkItemJumpItem } from './work-item-jump-item';

/**
 * Matches against the text of the row as it is displayed — "#29 ticket test 18" — rather than
 * against the code and the title separately.
 *
 * Searching the two fields independently looked more forgiving but produced nonsense: the query
 * "18 ticket test 29" matched "#29 ticket test 18", because 18 was found in the title, 29 in the
 * code and the rest anywhere. Every word was present, and the result was still wrong. Matching the
 * visible line keeps the answer explainable: what you typed is on screen, in that order, or it is
 * not a hit.
 */
export function matchesJumpSearch(item: WorkItemJumpItem, term: string): boolean {
  const query = normalizeJumpSearch(term);

  return !query || normalizeJumpSearch(`${item.code} ${item.title}`).includes(query);
}

/** Lowercases, drops the hash people copy from a code, and collapses runs of whitespace. */
export function normalizeJumpSearch(value: string): string {
  return value.toLocaleLowerCase().replace(/#/g, '').replace(/\s+/g, ' ').trim();
}
