import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { Router, NavigationEnd, ActivatedRoute, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { TooltipModule } from 'primeng/tooltip';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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

  readonly breadcrumbs = signal<BreadcrumbItem[]>([]);

  constructor() {
    this.breadcrumbs.set(this.build(this.activatedRoute.root));

    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.breadcrumbs.set(this.build(this.activatedRoute.root));
      });
  }

  private build(route: ActivatedRoute): BreadcrumbItem[] {
    const items: BreadcrumbItem[] = [];
    let wholePath = '';

    this.getLastChild(route).pathFromRoot.forEach((r) => {
      if (!r.snapshot) return; // ← добавь эту проверку

      const breadcrumb = r.routeConfig?.data?.['breadcrumb'] as
        | { title: string; icon?: string }
        | undefined;

      const segments = r.snapshot.url.map((u) => u.path).filter(Boolean);

      if (!breadcrumb || segments.length === 0) return;

      wholePath += `/${segments.join('/')}`;
      items.push({
        title: breadcrumb.title,
        icon: breadcrumb.icon,
        path: wholePath,
      });
    });

    return items;
  }

  private getLastChild(route: ActivatedRoute): ActivatedRoute {
    return route.firstChild ? this.getLastChild(route.firstChild) : route;
  }
}
