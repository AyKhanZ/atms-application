import { DestroyRef, Directive, ElementRef, afterNextRender, inject } from '@angular/core';

// shorter than this shows only two or three rows
const MIN_HEIGHT_REM = 36;

// measured, not guessed: a guessed offset left a gap on tall screens and a 2nd scrollbar when the header grew
// measured again on resize and when anything above changes
@Directive({ selector: '[appHistoryPaneHeight]' })
export class HistoryPaneHeightDirective {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      // no ResizeObserver in tests, min height stays
      if (typeof ResizeObserver === 'undefined') return;

      const columns = this.element.nativeElement;
      const scroller = scrollParent(columns);
      let frame = 0;

      // one measure per frame, setting the height triggers the observer again
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

function scrollParent(element: HTMLElement): HTMLElement {
  for (let node = element.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === 'auto' || overflowY === 'scroll') return node;
  }
  return document.scrollingElement instanceof HTMLElement
    ? document.scrollingElement
    : document.documentElement;
}
