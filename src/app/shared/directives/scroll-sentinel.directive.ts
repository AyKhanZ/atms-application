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

// put on an empty element after the last row
// IntersectionObserver, not scroll events, works in any scrolling container
@Directive({
  selector: '[appScrollSentinel]',
  // zero-height elements are never visible
  host: { style: 'display: block; min-height: 1px' },
})
export class ScrollSentinelDirective implements AfterViewInit, OnDestroy {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private observer?: IntersectionObserver;

  // false = nothing left or a load is running
  readonly appScrollSentinel = input(true);
  readonly reached = output<void>();

  ngAfterViewInit(): void {
    // no IntersectionObserver in tests, lists keep a button anyway
    if (typeof IntersectionObserver === 'undefined') return;

    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && this.appScrollSentinel()) {
          this.reached.emit();
        }
      },
      // start a bit before the end so rows are there in time
      { rootMargin: '200px' },
    );

    this.observer.observe(this.element.nativeElement);
    this.destroyRef.onDestroy(() => this.observer?.disconnect());
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
