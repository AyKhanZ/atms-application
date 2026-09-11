/**
 * One ancestor shown at the top of the jump panel, so the list says which part of the plan it
 * covers. Without it a search result looks arbitrary — especially once the search reaches the
 * server and can return items that are not visible in the tree behind the popover.
 */
export interface WorkItemJumpContext {
  /** PrimeIcons class, e.g. "pi-folder". */
  icon: string;
  title: string;
}
