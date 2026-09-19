import { BreadcrumbItem } from '../models/breadcrumb-item.model';
import { Injectable, signal } from '@angular/core';

export interface BreadcrumbOverride {
  title: string;
  icon?: string;
}

@Injectable({ providedIn: 'root' })
export class BreadcrumbOverrideService {
  private readonly overrides = signal<Record<string, BreadcrumbOverride>>({});
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

  set(path: string, title: string, icon?: string): void {
    this.overrides.update((current) => ({ ...current, [path]: { title, icon } }));
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
