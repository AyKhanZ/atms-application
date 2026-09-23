import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  computed,
  effect,
  inject,
  linkedSignal,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { ConfirmationService } from 'primeng/api';
import { Subject, debounceTime, of, catchError } from 'rxjs';
import { DictionaryModel } from '../../core/models/dictionary.model';
import { WorkTaskBoardFilter, WorkTaskBoardQuery } from '../../core/models/work-task-board';
import { WorkItemMutationError } from '../../core/models/work-items';
import { WorkTaskModel } from '../../core/models/work-tasks';
import { Permissions } from '../../core/enums/permissions.enum';
import { DictionaryService } from '../../core/services/dictionary.service';
import { SnackBarService } from '../../core/services/snack-bar.service';
import { WorkProjectsService } from '../../core/services/work-projects.service';
import { WorkTicketsService } from '../../core/services/work-tickets.service';
import { TaskBoardStoreActions, TaskBoardStoreSelectors } from '../../store/task-board';
import { UserStoreSelectors } from '../../store/user';
import { FilterToggleButtonComponent } from '../../shared/components/filter-toggle-button/filter-toggle-button.component';
import { ListSearchComponent } from '../../shared/components/list-search/list-search.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import {
  EntityTab,
  EntityTabsComponent,
} from '../../shared/components/entity-tabs/entity-tabs.component';
import {
  FilterOption,
  TaskFiltersComponent,
} from './components/task-filters/task-filters.component';
import { TaskBoardViewComponent } from './views/task-board-view/task-board-view.component';
import { TaskCalendarViewComponent } from './views/task-calendar-view/task-calendar-view.component';
import { TaskListViewComponent } from './views/task-list-view/task-list-view.component';
import { allProjectOptions, allTicketOptions } from './tasks-page.options';
import {
  TasksPageState,
  TasksView,
  clearedFilter,
  hasFilters,
  lastTasksPage,
  parseTasksPage,
  rememberTasksPage,
  tasksPageParams,
} from './tasks-page.utils';

/**
 * Tasks and subtasks from every project the user is in, as a board, a calendar or a list (see
 * Specs/09-task-views). Everything the page shows lives in its address, so a view can be shared and
 * survives a refresh; the last one used in this browser opens when the address says nothing.
 */
@Component({
  selector: 'app-tasks-page',
  imports: [
    ConfirmDialogComponent,
    EntityTabsComponent,
    FilterToggleButtonComponent,
    ListSearchComponent,
    TaskFiltersComponent,
    TaskBoardViewComponent,
    TaskCalendarViewComponent,
    TaskListViewComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './tasks-page.component.html',
  styleUrl: './tasks-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TasksPageComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly actions$ = inject(Actions);
  private readonly destroyRef = inject(DestroyRef);
  private readonly snackBar = inject(SnackBarService);
  private readonly dictionaries = inject(DictionaryService);
  private readonly projectsService = inject(WorkProjectsService);
  private readonly ticketsService = inject(WorkTicketsService);
  private readonly typing = new Subject<string>();

  private readonly me = this.store.selectSignal(UserStoreSelectors.getMe);
  private readonly permissions = this.store.selectSignal(UserStoreSelectors.getPermissions);
  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  readonly state = computed<TasksPageState>(() =>
    parseTasksPage(this.params(), this.me()?.id ?? null),
  );
  /** What the views ask the server for. */
  readonly query = computed<WorkTaskBoardQuery>(() => this.state().filter);

  /** What is in the search box now; the address follows it after a pause in typing. */
  readonly searchTerm = linkedSignal(() => this.state().filter.search);
  /** Closed by default, as on the other lists; the count on the button says what is in use. */
  readonly filtersOpen = signal(false);
  readonly activeFilterCount = computed(() => {
    const filter = this.state().filter;
    return [
      filter.projectIds.length > 0,
      filter.workTicketIds.length > 0,
      filter.kind !== null,
      filter.assigneeUserIds.length > 0 || filter.unassigned,
      filter.statusIds.length > 0,
      filter.priorityIds.length > 0,
      filter.deadline !== 'any',
    ].filter(Boolean).length;
  });

  readonly views: EntityTab<TasksView>[] = [
    { id: 'board', label: 'Board', icon: 'pi-th-large' },
    { id: 'calendar', label: 'Calendar', icon: 'pi-calendar' },
    { id: 'list', label: 'List', icon: 'pi-list' },
  ];

  /** Editing is checked per project by the server; this only keeps drag handles from people who
   *  can edit nothing at all, such as the client. */
  readonly canMove = computed(() => this.permissions().includes(Permissions.Project.Edit));
  readonly hasFilters = computed(() => hasFilters(this.state().filter));
  /** What an empty list says: the plain truth for the default "my tasks", else that filters hid it. */
  readonly emptyText = computed(() => {
    const filter = this.state().filter;
    const meId = this.me()?.id;
    const onlyMe =
      !!meId &&
      hasFilters(filter) &&
      !hasFilters({
        ...filter,
        assigneeUserIds: filter.assigneeUserIds.filter((id) => id !== meId),
      }) &&
      filter.assigneeUserIds.includes(meId);
    if (onlyMe) return 'Nothing is assigned to you';
    return hasFilters(filter) ? 'No tasks match these filters' : 'No tasks yet';
  });

  /** Cards name their project unless the page is narrowed to one. */
  readonly showProject = computed(() => this.state().filter.projectIds.length !== 1);
  /** Bumped to make the view reload everything, after the server refused a move. */
  readonly reloadToken = signal(0);

  readonly statuses = signal<DictionaryModel[]>([]);
  readonly statusOptions = computed<FilterOption<number>[]>(() =>
    this.statuses().map((status) => ({ value: status.id, label: status.name })),
  );
  readonly priorityOptions = signal<FilterOption<number>[]>([]);
  readonly projectOptions = signal<FilterOption[]>([]);
  readonly ticketOptions = signal<FilterOption[]>([]);
  private readonly assignees = this.store.selectSignal(TaskBoardStoreSelectors.getAssignees);
  readonly meOption = computed<FilterOption | null>(() => {
    const meId = this.me()?.id;
    return meId ? { value: meId, label: 'Me' } : null;
  });
  readonly peopleOptions = computed<FilterOption[]>(() => {
    const meId = this.me()?.id;
    return this.assignees()
      .filter((person) => person.id !== meId)
      .map((person) => ({ value: person.id, label: `${person.name} ${person.surname}` }))
      .sort((a, b) => a.label.localeCompare(b.label));
  });

  constructor() {
    this.restoreLastIfEmpty();
    this.loadDictionaries();

    allProjectOptions(this.projectsService)
      .pipe(
        catchError(() => of([])),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((options) => this.projectOptions.set(options));

    // People and tickets depend on the projects chosen.
    effect(() => {
      const projectIds = this.state().filter.projectIds;
      untracked(() => {
        this.store.dispatch(TaskBoardStoreActions.loadAssignees({ projectIds }));
        this.loadTickets(projectIds);
      });
    });

    // The last page used, remembered for the next visit.
    effect(() => {
      const params = tasksPageParams(this.state(), this.me()?.id ?? null);
      untracked(() => rememberTasksPage(params));
    });

    this.typing
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe((search) => this.navigate({ filter: { ...this.state().filter, search } }));

    this.actions$
      .pipe(
        ofType(TaskBoardStoreActions.moveTaskFailure, TaskBoardStoreActions.changeDeadlineFailure),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ error }) => {
        this.snackBar.error(moveErrorMessage(error));
        this.reloadToken.update((token) => token + 1);
      });

    this.actions$
      .pipe(ofType(TaskBoardStoreActions.moveTaskSuccess), takeUntilDestroyed(this.destroyRef))
      .subscribe(({ completeSubtasks }) => {
        // Closed subtasks moved too; reload so their cards are where they now belong.
        if (completeSubtasks) this.reloadToken.update((token) => token + 1);
        else this.store.dispatch(TaskBoardStoreActions.loadCounts({ query: this.query() }));
      });
  }

  ngOnDestroy(): void {
    this.store.dispatch(TaskBoardStoreActions.reset());
  }

  selectView(view: TasksView): void {
    this.navigate({ view });
  }

  changeSearch(search: string): void {
    this.searchTerm.set(search);
    this.typing.next(search);
  }

  changeFilter(filter: WorkTaskBoardFilter): void {
    this.navigate({ filter });
  }

  clearFilters(): void {
    // The search box has its own clear; the panel's Clear resets what the panel holds.
    this.navigate({ filter: { ...clearedFilter(), search: this.state().filter.search } });
  }

  /** Everything back to "anyone's work in every project", the search too. */
  clearAll(): void {
    this.navigate({ filter: clearedFilter() });
  }

  changeMonth(month: string): void {
    this.navigate({ month });
  }

  showWithoutDeadline(): void {
    this.navigate({ view: 'list', filter: { ...this.state().filter, deadline: 'none' } });
  }

  open(task: WorkTaskModel): void {
    void this.router.navigate([
      '/projects',
      task.workProjectId,
      'tickets',
      task.workTicket.id,
      'tasks',
      task.id,
    ]);
  }

  private navigate(patch: Partial<TasksPageState>): void {
    const next = { ...this.state(), ...patch };
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: tasksPageParams(next, this.me()?.id ?? null),
      // Filters are refinements of one page, not steps to go back through.
      replaceUrl: true,
    });
  }

  /** Opened with a bare address: the last view and filters used here, if any. */
  private restoreLastIfEmpty(): void {
    if (this.route.snapshot.queryParamMap.keys.length > 0) return;
    const last = lastTasksPage();
    if (last)
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: last,
        replaceUrl: true,
      });
  }

  private loadDictionaries(): void {
    this.dictionaries
      .getWorkTaskStatusDictionaries()
      .pipe(
        catchError(() => of([])),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((statuses) => this.statuses.set(statuses));
    this.dictionaries
      .getWorkItemPriorityDictionaries()
      .pipe(
        catchError(() => of([])),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((priorities) =>
        this.priorityOptions.set(priorities.map((item) => ({ value: item.id, label: item.name }))),
      );
  }

  private loadTickets(projectIds: readonly string[]): void {
    if (projectIds.length !== 1) {
      this.ticketOptions.set([]);
      return;
    }
    allTicketOptions(this.ticketsService, projectIds[0])
      .pipe(
        catchError(() => of([])),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((options) => this.ticketOptions.set(options));
  }
}

function moveErrorMessage(error: WorkItemMutationError): string {
  if (error.message) return error.message;
  if (error.status === 403) return 'You cannot move tasks in that project.';
  if (error.status === 404) return 'That task is no longer available.';
  return "We couldn't save the change. Please try again.";
}
