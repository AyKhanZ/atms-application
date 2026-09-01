import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class BreadcrumbOverrideService {
  private readonly overrides = signal<Record<string, string>>({});
  readonly value = this.overrides.asReadonly();

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
