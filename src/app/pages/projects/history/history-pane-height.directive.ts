import { DestroyRef, Directive, ElementRef, afterNextRender, inject } from '@angular/core';

/** The shortest the columns get, on a short window: below this they would show two or three rows. */
const MIN_HEIGHT_REM = 36;

/**
 * Lets the History columns reach down to the bottom of the page's scroll area, measured, not
 * guessed: what sits above them (top bar, header, tabs, status graph) and below them (the card's
 * edge, the page padding) is taken off the visible height. A guessed offset left empty space under
 * the columns on a tall monitor and a second scroll bar when the header grew.
 *
 * Measured again when the window changes size and when anything above the columns does — the
 * status graph folded, a title wrapped onto a second line.
 */
@Directive({ selector: '[appHistoryPaneHeight]' })
export class HistoryPaneHeightDirective {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      // Not in a test page without layout; the columns keep their minimum there.
      if (typeof ResizeObserver === 'undefined') return;

      const columns = this.element.nativeElement;
      const scroller = scrollParent(columns);
      let frame = 0;

      // One measure per frame: setting the height resizes the tab, which the observer reports back.
      const schedule = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => this.measure(columns, scroller));
      };
      const observer = new ResizeObserver(schedule);
      observer.observe(scroller);
      observer.observe(columns.parentElement?.parentElement ?? columns);

      this.destroyRef.onDestroy(() => {
        cancelAnimationFrame(frame);
        observer.disconnect();
      });
    });
  }

  private measure(columns: HTMLElement, scroller: HTMLElement): void {
    const area = scroller.getBoundingClientRect();
    const box = columns.getBoundingClientRect();
    const above = box.top - area.top + scroller.scrollTop;
    const below = scroller.scrollHeight - (box.bottom - area.top + scroller.scrollTop);
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const height = Math.max(scroller.clientHeight - above - below, MIN_HEIGHT_REM * rem);

    columns.style.setProperty('--history-pane-height', `${Math.floor(height)}px`);
  }
}

/** The nearest ancestor that scrolls: the page content of the layout, or the document itself. */
function scrollParent(element: HTMLElement): HTMLElement {
  for (let node = element.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === 'auto' || overflowY === 'scroll') return node;
  }
  return document.scrollingElement instanceof HTMLElement
    ? document.scrollingElement
    : document.documentElement;
}
