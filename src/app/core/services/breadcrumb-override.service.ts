import { BreadcrumbItem } from '../models/breadcrumb-item.model';
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class BreadcrumbOverrideService {
  private readonly overrides = signal<Record<string, string>>({});
  readonly value = this.overrides.asReadonly();
  private readonly trailOverride = signal<{ ownerPath: string; items: BreadcrumbItem[] } | null>(
    null,
  );
  readonly trail = this.trailOverride.asReadonly();

  setTrail(ownerPath: string, items: BreadcrumbItem[]): void {
    this.trailOverride.set({ ownerPath, items });
  }

  clearTrail(ownerPath: string): void {
    if (this.trailOverride()?.ownerPath === ownerPath) this.trailOverride.set(null);
  }

  set(path: string, title: string): void {
    this.overrides.update((current) => ({ ...current, [path]: title }));
  }

  clear(path: string): void {
    this.overrides.update((current) => {
      if (!(path in current)) return current;
      const next = { ...current };
      delete next[path];
      return next;
    });
  }
}
