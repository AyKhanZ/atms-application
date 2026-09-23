import {
  afterRenderEffect,
  computed,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';

export function calendarVisibleCount(
  total: number,
  height: number,
  card: number,
  gap: number,
  more: number,
): number {
  if (card <= 0) return Math.min(total, 1);
  const allFit = Math.floor((height + gap) / (card + gap));
  return total <= allFit ? total : Math.max(1, Math.floor((height - more) / (card + gap)));
}

@Directive({ selector: '[appCalendarDayCapacity]', exportAs: 'calendarCapacity' })
export class CalendarDayCapacityDirective {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly taskCount = input(0);
  readonly expanded = input(false);
  private readonly measured = signal({ height: 0, card: 0, gap: 0, more: 0 });
  readonly visibleCount = computed(() => {
    const { height, card, gap, more } = this.measured();
    return this.expanded()
      ? this.taskCount()
      : calendarVisibleCount(this.taskCount(), height, card, gap, more);
  });

  constructor() {
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.measure());
    observer?.observe(this.element.nativeElement);
    inject(DestroyRef).onDestroy(() => observer?.disconnect());
    afterRenderEffect(() => {
      this.taskCount();
      this.expanded();
      this.measure();
    });
  }

  private measure(): void {
    if (this.expanded()) return;
    const element = this.element.nativeElement;
    const card = element.querySelector<HTMLElement>('.chip');
    if (!card) return;
    const style = getComputedStyle(element);
    const height = element.clientHeight;
    const cardHeight = card.getBoundingClientRect().height;
    const gap = parseFloat(style.rowGap) || 0;
    const more = parseFloat(style.fontSize) * 1.75;
    this.measured.update((previous) =>
      previous.height === height &&
      previous.card === cardHeight &&
      previous.gap === gap &&
      previous.more === more
        ? previous
        : { height, card: cardHeight, gap, more },
    );
  }
}
