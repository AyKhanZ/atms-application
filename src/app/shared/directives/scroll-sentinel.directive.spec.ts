import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ScrollSentinelDirective } from './scroll-sentinel.directive';

/**
 * The browser only reports a crossing while it is drawing, which a test environment never does,
 * so the observer is replaced by one the test drives by hand.
 */
class FakeIntersectionObserver {
  static last: FakeIntersectionObserver | null = null;
  readonly observed: Element[] = [];
  disconnected = false;

  constructor(private readonly callback: IntersectionObserverCallback) {
    FakeIntersectionObserver.last = this;
  }

  observe(element: Element): void {
    this.observed.push(element);
  }

  disconnect(): void {
    this.disconnected = true;
  }

  trigger(isIntersecting: boolean): void {
    this.callback([{ isIntersecting } as IntersectionObserverEntry], this as never);
  }
}

@Component({
  imports: [ScrollSentinelDirective],
  template: `<div [appScrollSentinel]="enabled()" (reached)="reached = reached + 1"></div>`,
})
class HostComponent {
  readonly enabled = signal(true);
  reached = 0;
}

describe('ScrollSentinelDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  const original = window.IntersectionObserver;

  beforeEach(async () => {
    (window as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
      FakeIntersectionObserver;
    FakeIntersectionObserver.last = null;

    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    (window as unknown as { IntersectionObserver: unknown }).IntersectionObserver = original;
  });

  it('watches the element it sits on', () => {
    expect(FakeIntersectionObserver.last?.observed).toHaveLength(1);
  });

  it('asks for the next page when the element comes into view', () => {
    FakeIntersectionObserver.last?.trigger(true);

    expect(fixture.componentInstance.reached).toBe(1);
  });

  it('says nothing while the element is out of view', () => {
    FakeIntersectionObserver.last?.trigger(false);

    expect(fixture.componentInstance.reached).toBe(0);
  });

  // A list that is already loading, or has nothing left, turns the sentinel off; without this
  // every frame of a fast scroll would start another request for the same page.
  it('stays quiet while it is switched off', () => {
    fixture.componentInstance.enabled.set(false);
    fixture.detectChanges();

    FakeIntersectionObserver.last?.trigger(true);

    expect(fixture.componentInstance.reached).toBe(0);
  });

  it('stops watching when the element goes away', () => {
    const observer = FakeIntersectionObserver.last;
    fixture.destroy();

    expect(observer?.disconnected).toBe(true);
  });
});
