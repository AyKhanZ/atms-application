import { Injectable, computed, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LayoutService {
  private readonly mobileBreakpoint = 768;
  private readonly expandedWidth = 260;
  private readonly collapsedWidth = 80;
  private readonly mobileWidth = 72;

  collapsed = signal(false);
  viewportWidth = signal(window.innerWidth);

  sidenavWidth = computed(() => {
    if (this.viewportWidth() <= this.mobileBreakpoint) {
      return this.mobileWidth;
    }

    return this.collapsed() ? this.collapsedWidth : this.expandedWidth;
  });

  constructor() {
    window.addEventListener('resize', () => this.viewportWidth.set(window.innerWidth));
  }

  toggleSidebar(): void {
    this.collapsed.update((v) => !v);
  }
}
