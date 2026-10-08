import { Injectable, Signal, computed, signal } from '@angular/core';

// picked by available width, not by the user
export type SidenavMode = 'full' | 'icons' | 'hidden';

@Injectable({
  providedIn: 'root',
})
export class LayoutService {
  private readonly expandedWidth = 260;
  private readonly iconsWidth = 80;

  // below 1024 menu becomes a drawer
  private readonly hasRoomForMenu = this.media('(min-width: 1024px)', (matches) => {
    // widening past the breakpoint brings the menu back, close the drawer or it sits on top
    if (matches) this.drawerOpen.set(false);
  });

  // below 1280 no room for labels
  private readonly hasRoomForLabels = this.media('(min-width: 1280px)');

  // same breakpoint the stylesheets use for one column
  readonly isPhone = this.media('(max-width: 767px)');

  // user choice, only works where labels fit
  collapsed = signal(false);
  readonly drawerOpen = signal(false);

  readonly mode = computed<SidenavMode>(() => {
    if (!this.hasRoomForMenu()) return 'hidden';
    if (!this.hasRoomForLabels()) return 'icons';
    return this.collapsed() ? 'icons' : 'full';
  });

  // drawer floats over the page, so 0
  sidenavWidth = computed(() => {
    switch (this.mode()) {
      case 'hidden':
        return 0;
      case 'icons':
        return this.iconsWidth;
      default:
        return this.expandedWidth;
    }
  });

  // open drawer is the full menu
  readonly showLabels = computed(() => this.mode() === 'full' || this.drawerOpen());

  readonly canCollapse = computed(() => this.hasRoomForLabels());

  toggleSidebar(): void {
    this.collapsed.update((v) => !v);
  }

  openDrawer(): void {
    this.drawerOpen.set(true);
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  // media queries not resize events: same width as the css and fires once on the threshold
  private media(query: string, onChange?: (matches: boolean) => void): Signal<boolean> {
    // no matchMedia in unit tests, use desktop layout
    if (typeof window.matchMedia !== 'function') return signal(false).asReadonly();
    const list = window.matchMedia(query);
    const matches = signal(list.matches);

    list.addEventListener('change', (event) => {
      matches.set(event.matches);
      onChange?.(event.matches);
    });

    return matches.asReadonly();
  }
}
