import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { Router, NavigationEnd, ActivatedRoute, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { TooltipModule } from 'primeng/tooltip';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BreadcrumbOverrideService } from '../../../core/services/breadcrumb-override.service';

export interface BreadcrumbItem {
  title: string;
  path: string;
  icon?: string;
}

@Component({
  selector: 'app-breadcrumbs',
  imports: [NgClass, RouterLink, TooltipModule],
  templateUrl: './breadcrumbs.component.html',
  styleUrl: './breadcrumbs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreadcrumbsComponent {
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly breadcrumbOverride = inject(BreadcrumbOverrideService);

  /**
   * Bumped on every NavigationEnd. The router's own state is not a signal, so this is what
   * tells `breadcrumbs` that the URL changed; the override map is tracked directly.
   */
  private readonly navigationTick = signal(0);

  /**
   * A computed rather than a signal written from an effect: the trail is purely derived from
   * the current route plus the registered overrides, and deriving it keeps the two inputs from
   * going out of sync (the previous version only stayed correct because navigation happened to
   * rebuild it as well).
   */
  readonly breadcrumbs = computed<BreadcrumbItem[]>(() => {
    this.navigationTick();
    return this.build(this.activatedRoute.root, this.breadcrumbOverride.value());
  });

  constructor() {
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.navigationTick.update((tick) => tick + 1));
  }

  private build(route: ActivatedRoute, overrides: Record<string, string>): BreadcrumbItem[] {
    const items: BreadcrumbItem[] = [];
    let wholePath = '';

    this.getLastChild(route).pathFromRoot.forEach((r) => {
      if (!r.snapshot) return;

      const segments = r.snapshot.url.map((u) => u.path).filter(Boolean);
      if (segments.length === 0) return;

      // A single route config entry can match several URL segments at once (e.g.
      // ':projectId/tickets/:ticketId'), so each segment is checked individually for a
      // registered override — that's what lets a compound route still surface a crumb for
      // each level (project, then ticket) instead of only one crumb for the whole node.
      segments.forEach((segment, index) => {
        wholePath += `/${segment}`;
        const isLastSegment = index === segments.length - 1;

        if (!isLastSegment) {
          const title = overrides[wholePath];
          if (title) items.push({ title, path: wholePath });
          return;
        }

        const breadcrumb = r.routeConfig?.data?.['breadcrumb'] as
          | { title: string; icon?: string }
          | undefined;
        const title = overrides[wholePath] ?? breadcrumb?.title;
        if (!title) return;

        items.push({ title, icon: breadcrumb?.icon, path: wholePath });
      });
    });

    return items;
  }

  private getLastChild(route: ActivatedRoute): ActivatedRoute {
    return route.firstChild ? this.getLastChild(route.firstChild) : route;
  }
}
