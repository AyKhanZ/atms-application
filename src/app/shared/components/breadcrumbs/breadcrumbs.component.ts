import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  OnDestroy,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { Router, NavigationEnd, ActivatedRoute, RouterLink } from '@angular/router';
import { filter, fromEvent } from 'rxjs';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { TooltipModule } from 'primeng/tooltip';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  BreadcrumbOverride,
  BreadcrumbOverrideService,
} from '../../../core/services/breadcrumb-override.service';

import { BreadcrumbItem } from '../../../core/models/breadcrumb-item.model';
import { currentLanguage } from '../../../core/i18n/active-language';

@Component({
  selector: 'app-breadcrumbs',
  imports: [NgClass, RouterLink, MenuModule, TooltipModule, TranslocoDirective],
  templateUrl: './breadcrumbs.component.html',
  styleUrl: './breadcrumbs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreadcrumbsComponent implements AfterViewInit, OnDestroy {
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly bar = viewChild<ElementRef<HTMLElement>>('bar');

  // same as .crumb__title max-width
  private static readonly maxTitleWidth = 240;

  // first and last level are never folded
  readonly foldedCount = signal(0);

  // on a phone even root + current can be too much, then root goes in the menu
  readonly rootFolded = signal(false);

  private observer?: ResizeObserver;
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly breadcrumbOverride = inject(BreadcrumbOverrideService);
  private readonly transloco = inject(TranslocoService);

  // router state isnt a signal, this tells breadcrumbs the url changed
  private readonly navigationTick = signal(0);

  // computed, not set from an effect, so route and overrides cant go out of sync
  readonly breadcrumbs = computed<BreadcrumbItem[]>(() => {
    this.navigationTick();
    currentLanguage();
    const trail = this.breadcrumbOverride.trail();
    const items =
      trail?.ownerPath === this.router.url.split(/[?#]/)[0]
        ? trail.items
        : this.build(this.activatedRoute.root, this.breadcrumbOverride.value());
    return items.map((item) => ({ ...item, title: this.caption(item.title) }));
  });

  readonly foldedItems = computed<MenuItem[]>(() =>
    this.breadcrumbs()
      .slice(this.rootFolded() ? 0 : 1, 1 + this.foldedCount())
      .map((crumb) => ({
        label: crumb.title,
        icon: crumb.icon ? `pi ${crumb.icon}` : undefined,
        routerLink: crumb.path,
      })),
  );

  readonly currentPath = computed(() => {
    this.navigationTick();
    return this.router.url.split(/[?#]/)[0];
  });

  isFolded(index: number, last: boolean): boolean {
    if (last) return false;
    return index === 0 ? this.rootFolded() : index <= this.foldedCount();
  }

  ngAfterViewInit(): void {
    // no ResizeObserver in tests, the window listener still works
    if (typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver(() => this.measure());
      const bar = this.bar()?.nativeElement;
      if (bar) this.observer.observe(bar);
    }

    this.measure();
  }

  // observer for the bar itself, window listener for window resizes
  private watchResize(): void {
    fromEvent(window, 'resize')
      .pipe(takeUntilDestroyed(this.destroyRef))
      // new width is known only after the next layout
      .subscribe(() => requestAnimationFrame(() => this.measure()));
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  // folded crumbs stay in the dom so every level can be measured, otherwise the trail stays folded forever
  // a crumb counts as chrome + capped title, not its squeezed width
  private measure(): void {
    const bar = this.bar()?.nativeElement;
    if (!bar) return;

    const crumbs = Array.from(bar.querySelectorAll<HTMLElement>('.crumb:not(.crumb--more)'));
    if (crumbs.length < 3) {
      this.foldedCount.set(0);
      this.rootFolded.set(false);
      return;
    }

    const widths = crumbs.map((crumb) => this.naturalWidth(crumb));
    const more = this.naturalWidth(bar.querySelector<HTMLElement>('.crumb--more'));
    const available = bar.clientWidth;
    const from = (index: number) => widths.slice(index).reduce((total, width) => total + width, 0);
    const needed = (folded: number) => widths[0] + (folded ? more : 0) + from(folded + 1);

    let folded = 0;
    while (folded < widths.length - 2 && needed(folded) > available) folded++;

    this.foldedCount.set(folded);
    this.rootFolded.set(needed(folded) > available);
  }

  private naturalWidth(element: HTMLElement | null): number {
    if (!element) return 0;

    const title = element.querySelector<HTMLElement>('.crumb__title');
    if (!title) return element.offsetWidth;

    const readable = Math.min(title.scrollWidth, BreadcrumbsComponent.maxTitleWidth);
    return element.offsetWidth - title.clientWidth + readable;
  }

  constructor() {
    effect(() => {
      this.breadcrumbs();
      afterNextRender(() => this.measure(), { injector: this.injector });
    });

    this.watchResize();

    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.navigationTick.update((tick) => tick + 1));
  }

  private build(
    route: ActivatedRoute,
    overrides: Record<string, BreadcrumbOverride>,
  ): BreadcrumbItem[] {
    const items: BreadcrumbItem[] = [];
    let wholePath = '';

    this.getLastChild(route).pathFromRoot.forEach((r) => {
      if (!r.snapshot) return;

      const segments = r.snapshot.url.map((u) => u.path).filter(Boolean);
      if (segments.length === 0) return;

      // one route can match several segments (':projectId/tickets/:ticketId'), check each for an override
      segments.forEach((segment, index) => {
        wholePath += `/${segment}`;
        const isLastSegment = index === segments.length - 1;

        if (!isLastSegment) {
          const override = overrides[wholePath];
          if (override) items.push({ ...override, path: wholePath });
          return;
        }

        const breadcrumb = r.routeConfig?.data?.['breadcrumb'] as
          | { title: string; icon?: string }
          | undefined;
        const override = overrides[wholePath];
        const title = override?.title ?? breadcrumb?.title;
        if (!title) return;

        items.push({ title, icon: override?.icon ?? breadcrumb?.icon, path: wholePath });
      });
    });

    return items;
  }

  private getLastChild(route: ActivatedRoute): ActivatedRoute {
    return route.firstChild ? this.getLastChild(route.firstChild) : route;
  }

  // route data keeps a key; a name the user typed has a space and stays as written
  private caption(title: string): string {
    return /^[a-zA-Z]+(?:\.[a-zA-Z0-9]+)+$/.test(title) ? this.transloco.translate(title) : title;
  }
}
