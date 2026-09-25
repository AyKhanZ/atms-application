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
import { HistorySubject, groupHistory, historyKey } from '../../../../core/utils/history.utils';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { HistoryStoreActions, HistoryStoreSelectors } from '../../../../store/history';
import { HistoryListState } from '../../../../store/history/history.state';
import { HistoryEntryDetailsComponent } from '../components/history-entry-details/history-entry-details.component';
import { HistoryListComponent } from '../components/history-list/history-list.component';
import { HistoryStateBarComponent } from '../components/history-state-bar/history-state-bar.component';
import { HistorySectionsService } from '../history-sections.service';
import { HistoryPaneHeightDirective } from '../history-pane-height.directive';

/**
 * The History tab of a project, ticket, task or subtask: how the status went on top, the entries on
 * the left, what the chosen one changed on the right. On a narrow tab the two take turns.
 */
@Component({
  selector: 'app-history-tab',
  imports: [
    ButtonModule,
    EmptyStateComponent,
    HistoryEntryDetailsComponent,
    HistoryListComponent,
    HistoryPaneHeightDirective,
    HistoryStateBarComponent,
    SkeletonModule,
  ],
  templateUrl: './history-tab.component.html',
  styleUrl: './history-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryTabComponent implements OnDestroy {
  private readonly store = inject(Store);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  protected readonly sections = inject(HistorySectionsService);

  readonly projectId = input.required<string>();
  readonly scope = input.required<HistoryScope>();
  readonly subject = input.required<HistorySubject>();
  /** The status on the page header, for an item whose status never changed on record. */
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
  /** The newest entry until another one is chosen. */
  readonly selected = computed<HistoryEntryModel | null>(
    () =>
      this.entries().find((entry) => entry.id === this.selectedId()) ?? this.entries()[0] ?? null,
  );
  /** Narrow tab only: the details are shown in place of the list. */
  readonly detailsOpen = signal(false);

  private loadedKey: string | null = null;

  constructor() {
    // Keyed by the string, not the scope object: a parent passing a fresh object each time would
    // otherwise reload on every change detection.
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

  /** Back to the list, on the row that was open. */
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
