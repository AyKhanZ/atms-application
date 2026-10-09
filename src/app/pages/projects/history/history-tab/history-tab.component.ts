import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  OnDestroy,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { HistoryEntityType } from '../../../../core/enums/history-entity-type.enum';
import { DictionaryModel } from '../../../../core/models/dictionary.model';
import { HistoryEntryModel, HistoryScope } from '../../../../core/models/history';
import { FoldedSectionsService } from '../../../../core/services/folded-sections.service';
import { HistorySubject, groupHistory, historyKey } from '../../../../core/utils/history.utils';
import { CollapsibleSectionComponent } from '../../../../shared/components/collapsible-section/collapsible-section.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { HistoryStoreActions, HistoryStoreSelectors } from '../../../../store/history';
import { HistoryListState } from '../../../../store/history/history.state';
import { HistoryEntryDetailsComponent } from '../components/history-entry-details/history-entry-details.component';
import { HistoryListComponent } from '../components/history-list/history-list.component';
import { HistoryStateBarComponent } from '../components/history-state-bar/history-state-bar.component';
import { TranslocoDirective } from '@jsverse/transloco';
import { HistoryPaneHeightDirective } from '../history-pane-height.directive';

@Component({
  selector: 'app-history-tab',
  imports: [
    ButtonModule,
    CollapsibleSectionComponent,
    EmptyStateComponent,
    HistoryEntryDetailsComponent,
    HistoryListComponent,
    HistoryPaneHeightDirective,
    HistoryStateBarComponent,
    SkeletonModule,
    TranslocoDirective,
  ],
  templateUrl: './history-tab.component.html',
  styleUrl: './history-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryTabComponent implements OnDestroy {
  private readonly store = inject(Store);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly sections = inject(FoldedSectionsService);
  // kept for every History tab
  protected readonly statesOpen = this.sections.open('history.states');
  protected readonly entriesOpen = this.sections.open('history.entries');

  readonly projectId = input.required<string>();
  readonly scope = input.required<HistoryScope>();
  readonly subject = input.required<HistorySubject>();
  // for an item whose status never changed
  readonly currentStatus = input<DictionaryModel | null>(null);

  protected readonly skeletonRows = [0, 1, 2, 3, 4];

  readonly key = computed(() => historyKey(this.projectId(), this.scope()));
  readonly entityType = computed(() => {
    switch (this.scope().kind) {
      case 'project':
        return HistoryEntityType.Project;
      case 'ticket':
        return HistoryEntityType.WorkTicket;
      case 'task':
        return HistoryEntityType.WorkTask;
    }
  });

  private readonly lists = this.store.selectSignal(HistoryStoreSelectors.getLists);
  readonly list = computed<HistoryListState | undefined>(() => this.lists()[this.key()]);
  readonly entries = computed(() => this.list()?.items ?? []);
  readonly groups = computed(() => groupHistory(this.entries()));
  readonly loading = computed(() => {
    const list = this.list();
    return !list || (list.loading && !list.items.length);
  });
  readonly error = computed(() => !!this.list()?.error && !this.entries().length);

  private readonly selectedId = signal<string | null>(null);
  // newest until another is chosen
  readonly selected = computed<HistoryEntryModel | null>(
    () =>
      this.entries().find((entry) => entry.id === this.selectedId()) ?? this.entries()[0] ?? null,
  );
  // narrow tab only
  readonly detailsOpen = signal(false);

  private loadedKey: string | null = null;

  constructor() {
    // keyed by the string, a fresh scope object from the parent would reload every change detection
    effect(() => {
      const key = this.key();
      untracked(() => {
        if (this.loadedKey && this.loadedKey !== key) this.clear(this.loadedKey);
        this.loadedKey = key;
        this.selectedId.set(null);
        this.detailsOpen.set(false);
        this.load();
      });
    });
  }

  ngOnDestroy(): void {
    if (this.loadedKey) this.clear(this.loadedKey);
  }

  load(): void {
    this.store.dispatch(
      HistoryStoreActions.load({
        historyKey: this.key(),
        projectId: this.projectId(),
        scope: this.scope(),
      }),
    );
  }

  loadMore(): void {
    const cursor = this.list()?.nextCursor;
    if (!cursor) return;

    this.store.dispatch(
      HistoryStoreActions.loadMore({
        historyKey: this.key(),
        projectId: this.projectId(),
        scope: this.scope(),
        cursor,
      }),
    );
  }

  select(entry: HistoryEntryModel): void {
    this.selectedId.set(entry.id);
    this.detailsOpen.set(true);
  }

  closeDetails(): void {
    const id = this.selected()?.id;
    this.detailsOpen.set(false);

    afterNextRender(
      () => {
        const row = this.host.nativeElement.querySelector<HTMLElement>(`[data-entry-id="${id}"]`);
        row?.scrollIntoView({ block: 'nearest' });
        row?.focus({ preventScroll: true });
      },
      { injector: this.injector },
    );
  }

  private clear(historyKey: string): void {
    this.store.dispatch(HistoryStoreActions.clear({ historyKey }));
  }
}
