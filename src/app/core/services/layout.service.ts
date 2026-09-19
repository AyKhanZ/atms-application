import { Injectable, Signal, computed, signal } from '@angular/core';

/**
 * How the side menu is drawn. Which one applies is decided by the width available, not by the
 * user: a phone has no room for a menu that is always there, and a 1440px screen has no reason
 * to hide one.
 */
export type SidenavMode = 'full' | 'icons' | 'hidden';

@Injectable({
  providedIn: 'root',
})
export class LayoutService {
  private readonly expandedWidth = 260;
  private readonly iconsWidth = 80;

  /** Below 1024 the menu does not fit next to the content and becomes a drawer. */
  private readonly hasRoomForMenu = this.media('(min-width: 1024px)', (matches) => {
    // Widening past the breakpoint puts the menu back on the page; an open drawer would then
    // sit on top of the menu it stands in for.
    if (matches) this.drawerOpen.set(false);
  });

  /** Below 1280 there is room for the menu but not for its labels. */
  private readonly hasRoomForLabels = this.media('(min-width: 1280px)');

  /** The user's own choice, honoured only where there is room for labels in the first place. */
  collapsed = signal(false);
  readonly drawerOpen = signal(false);

  readonly mode = computed<SidenavMode>(() => {
    if (!this.hasRoomForMenu()) return 'hidden';
    if (!this.hasRoomForLabels()) return 'icons';
    return this.collapsed() ? 'icons' : 'full';
  });

  /** Width the page has to leave for the menu. A drawer floats over the page and reserves none. */
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

  /** An open drawer is the full menu, so it shows labels whatever the screen is. */
  readonly showLabels = computed(() => this.mode() === 'full' || this.drawerOpen());

  /** Collapsing by hand only makes sense where the menu has labels to give up. */
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

  /**
   * The breakpoints are read through media queries, not from a resize handler: the query is the
   * same width the stylesheet uses, so the two cannot drift apart, and it fires once when the
   * threshold is crossed instead of on every pixel of a drag.
   */
  private media(query: string, onChange?: (matches: boolean) => void): Signal<boolean> {
    const list = window.matchMedia(query);
    const matches = signal(list.matches);

    list.addEventListener('change', (event) => {
      matches.set(event.matches);
      onChange?.(event.matches);
    });

    return matches.asReadonly();
  }
}
