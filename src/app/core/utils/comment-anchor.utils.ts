/** The fragment a comment's link ends with; the discussion scrolls to it on opening. */
export function commentAnchor(commentId: string): string {
  return `comment-${commentId}`;
}
