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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  BreadcrumbOverride,
  BreadcrumbOverrideService,
} from '../../../core/services/breadcrumb-override.service';

import { BreadcrumbItem } from '../../../core/models/breadcrumb-item.model';

@Component({
  selector: 'app-breadcrumbs',
  imports: [NgClass, RouterLink, MenuModule, TooltipModule],
  templateUrl: './breadcrumbs.component.html',
  styleUrl: './breadcrumbs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreadcrumbsComponent implements AfterViewInit, OnDestroy {
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly bar = viewChild<ElementRef<HTMLElement>>('bar');

  /** Longest a single crumb may count as when deciding what fits, in pixels. Mirrors the
   *  `max-width` of `.crumb__title`, so a measured crumb is exactly as wide as a drawn one. */
  private static readonly maxTitleWidth = 240;

  /**
   * How many levels after the first are folded into the «…» button. The first and the last level
   * are never folded: the root is what you go back to, the last one is where you are.
   */
  readonly foldedCount = signal(0);

  /** Last resort: on a phone even the root plus the current level can be too much, and then the
   *  root goes into the menu as well. The level you are on is never folded. */
  readonly rootFolded = signal(false);

  private observer?: ResizeObserver;
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
    const trail = this.breadcrumbOverride.trail();
    if (trail?.ownerPath === this.router.url.split(/[?#]/)[0]) return trail.items;
    return this.build(this.activatedRoute.root, this.breadcrumbOverride.value());
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
    // Guarded: the unit test environment has no ResizeObserver, and the window listener below
    // still keeps the trail correct without it.
    if (typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver(() => this.measure());
      const bar = this.bar()?.nativeElement;
      if (bar) this.observer.observe(bar);
    }

    this.measure();
  }

  /** The observer covers the bar changing size on its own; the window listener covers the window
   *  changing size, which does not always resize the bar itself. */
  private watchResize(): void {
    fromEvent(window, 'resize')
      .pipe(takeUntilDestroyed(this.destroyRef))
      // After a resize the new width is only known once the browser has laid the page out again.
      .subscribe(() => requestAnimationFrame(() => this.measure()));
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  /**
   * Folded crumbs stay in the DOM, taken out of flow instead of removed, so every level can be
   * measured whatever the current state is. That is what lets the trail open back up again: a
   * trail that measured only what it currently draws would shrink its own idea of how much room
   * it needs and stay folded for good.
   *
   * A crumb counts as its chrome plus its title capped at a readable length, not as whatever the
   * layout squeezed it to, so the measurement does not depend on the layout it decides.
   */
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

      // A single route config entry can match several URL segments at once (e.g.
      // ':projectId/tickets/:ticketId'), so each segment is checked individually for a
      // registered override — that's what lets a compound route still surface a crumb for
      // each level (project, then ticket) instead of only one crumb for the whole node.
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
}
