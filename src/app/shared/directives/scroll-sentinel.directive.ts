import {
  AfterViewInit,
  DestroyRef,
  Directive,
  ElementRef,
  OnDestroy,
  inject,
  input,
  output,
} from '@angular/core';

/**
 * Fires once the element it sits on comes into view, which is how a list loads its next page
 * without a button. Put it on an empty element after the last row.
 *
 * It watches instead of listening to scroll events: the browser reports the crossing itself,
 * so nothing runs on the frames in between, and it works inside any scrolling container.
 */
@Directive({
  selector: '[appScrollSentinel]',
  // A zero-height element is never reported as visible, so the element is given a size here
  // rather than leaving every list to remember it.
  host: { style: 'display: block; min-height: 1px' },
})
export class ScrollSentinelDirective implements AfterViewInit, OnDestroy {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private observer?: IntersectionObserver;

  /** While false the sentinel stays quiet: nothing left to load, or a load is already running. */
  readonly appScrollSentinel = input(true);
  readonly reached = output<void>();

  ngAfterViewInit(): void {
    // Guarded: the unit test environment has no IntersectionObserver, and a list always keeps a
    // button as the way in without one.
    if (typeof IntersectionObserver === 'undefined') return;

    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && this.appScrollSentinel()) {
          this.reached.emit();
        }
      },
      // Start loading a little before the end is on screen, so the next rows are usually there
      // by the time the reader gets to them.
      { rootMargin: '200px' },
    );

    this.observer.observe(this.element.nativeElement);
    this.destroyRef.onDestroy(() => this.observer?.disconnect());
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
