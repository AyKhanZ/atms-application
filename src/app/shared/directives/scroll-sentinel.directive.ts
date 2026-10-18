import {
  AfterViewInit,
  DestroyRef,
  Directive,
  ElementRef,
  OnDestroy,
  effect,
  inject,
  input,
  output,
  untracked,
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
  private visible = false;

  // false = nothing left or a load is running
  readonly appScrollSentinel = input(true);
  readonly reached = output<void>();

  constructor() {
    // a page too short to push the element out leaves it in view, and the observer stays silent then
    effect(() => {
      if (this.appScrollSentinel() && this.visible) untracked(() => this.reached.emit());
    });
  }

  ngAfterViewInit(): void {
    // no IntersectionObserver in tests, lists keep a button anyway
    if (typeof IntersectionObserver === 'undefined') return;

    this.observer = new IntersectionObserver(
      (entries) => {
        this.visible = entries.at(-1)?.isIntersecting ?? false;
        if (this.visible && this.appScrollSentinel()) this.reached.emit();
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
