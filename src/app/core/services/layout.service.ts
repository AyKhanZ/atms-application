import { Injectable, computed, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LayoutService {
  collapsed = signal(false);

  sidenavWidth = computed(() => (this.collapsed() ? 72 : 260));

  toggleSidebar(): void {
    this.collapsed.update((v) => !v);
  }
}
