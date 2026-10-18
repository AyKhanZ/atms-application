// what RouterLink navigates itself; with a modifier or another button the browser opens a tab or window
export function isPlainClick(event: MouseEvent): boolean {
  return (
    event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey
  );
}
