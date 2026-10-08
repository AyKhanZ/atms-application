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
import { Subject, debounceTime } from 'rxjs';
import {
  WorkTaskBoardFilter,
  WorkTaskBoardQuery,
  WorkTaskBoardOrder,
} from '../../core/models/work-task-board';
import { WorkItemMutationError } from '../../core/models/work-items';
import { WorkTaskModel } from '../../core/models/work-tasks';
import { Permissions } from '../../core/enums/permissions.enum';
import { SnackBarService } from '../../core/services/snack-bar.service';
import { VisiblePageRefreshService } from '../../core/services/visible-page-refresh.service';
import { TaskBoardStoreActions } from '../../store/task-board';
import { UserStoreSelectors } from '../../store/user';
import { FilterToggleButtonComponent } from '../../shared/components/filter-toggle-button/filter-toggle-button.component';
import { ListSearchComponent } from '../../shared/components/list-search/list-search.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import {
  EntityTab,
  EntityTabsComponent,
} from '../../shared/components/entity-tabs/entity-tabs.component';
import { TaskFiltersComponent } from './components/task-filters/task-filters.component';
import { TaskBoardViewComponent } from './views/task-board-view/task-board-view.component';
import { TaskCalendarViewComponent } from './views/task-calendar-view/task-calendar-view.component';
import { TaskListViewComponent } from './views/task-list-view/task-list-view.component';
import { TaskFilterOptionsService } from './task-filter-options.service';
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

// everything is in the url so it can be shared and survives refresh; last view opens on a bare url
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
  providers: [ConfirmationService, TaskFilterOptionsService],
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
  private readonly typing = new Subject<string>();

  private readonly me = this.store.selectSignal(UserStoreSelectors.getMe);
  private readonly permissions = this.store.selectSignal(UserStoreSelectors.getPermissions);
  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  readonly state = computed<TasksPageState>(() =>
    parseTasksPage(this.params(), this.me()?.id ?? null),
  );
  readonly query = computed<WorkTaskBoardQuery>(() => this.state().filter);

  // url follows after a pause in typing
  readonly searchTerm = linkedSignal(() => this.state().filter.search);
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
      filter.deadlineFrom !== null || filter.deadlineTo !== null,
    ].filter(Boolean).length;
  });

  readonly views: EntityTab<TasksView>[] = [
    { id: 'board', label: 'Board', icon: 'pi-th-large' },
    { id: 'calendar', label: 'Calendar', icon: 'pi-calendar' },
    { id: 'list', label: 'List', icon: 'pi-list' },
  ];

  // server checks per project, this only hides drag handles from people who cant edit anything (clients)
  readonly canMove = computed(() => this.permissions().includes(Permissions.Project.Edit));
  readonly onlyMine = computed(() => {
    const { assigneeUserIds, unassigned } = this.state().filter;
    const meId = this.me()?.id;
    return !!meId && !unassigned && assigneeUserIds.length === 1 && assigneeUserIds[0] === meId;
  });
  // plain text for default "my tasks", else say filters hid it
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
    return hasFilters(filter) ? 'No matching tasks' : 'No tasks yet';
  });

  readonly showProject = computed(() => this.state().filter.projectIds.length !== 1);
  // bumped to reload everything after the server refused a move
  readonly reloadToken = signal(0);

  readonly options = inject(TaskFilterOptionsService);

  constructor() {
    this.restoreLastIfEmpty();

    effect(() => {
      if (this.params().get('view') === 'calendar' && this.params().get('deadline') === 'none') {
        untracked(() => this.navigate({ filter: this.state().filter }));
      }
    });

    effect(() => {
      const { projectIds, workTicketIds } = this.state().filter;
      untracked(() => this.options.select(projectIds, workTicketIds));
    });

    effect(() => {
      const params = tasksPageParams(this.state(), this.me()?.id ?? null);
      untracked(() => rememberTasksPage(params));
    });

    this.typing
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe((search) => this.navigate({ filter: { ...this.state().filter, search } }));

    // someone may have moved cards meanwhile, reload on coming back, max once a minute
    inject(VisiblePageRefreshService)
      .onReturn('tasks-page', 60_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.reloadToken.update((token) => token + 1));

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
        // closed subtasks moved too, reload so their cards are right
        if (completeSubtasks) this.reloadToken.update((token) => token + 1);
        else this.store.dispatch(TaskBoardStoreActions.loadCounts({ query: this.query() }));
      });
  }

  ngOnDestroy(): void {
    this.store.dispatch(TaskBoardStoreActions.reset());
  }

  selectView(view: TasksView): void {
    const filter = this.state().filter;
    this.navigate({
      view,
      filter:
        view === 'calendar' && filter.deadline === 'none' ? { ...filter, deadline: 'any' } : filter,
    });
  }

  changeOrder(order: WorkTaskBoardOrder): void {
    this.navigate({ order });
  }

  changeSearch(search: string): void {
    this.searchTerm.set(search);
    this.typing.next(search);
  }

  changeFilter(filter: WorkTaskBoardFilter): void {
    this.navigate({ filter });
  }

  clearFilters(): void {
    // search has its own clear, panel Clear resets only the panel
    this.navigate({ filter: { ...clearedFilter(), search: this.state().filter.search } });
  }

  changeMonth(month: string): void {
    this.navigate({ month });
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
      // filters arent steps to go back through
      replaceUrl: true,
    });
  }

  // bare url opens the last view and filters
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
}

function moveErrorMessage(error: WorkItemMutationError): string {
  if (error.message) return error.message;
  if (error.status === 403) return 'You cannot move tasks in that project.';
  if (error.status === 404) return 'That task is no longer available.';
  return "We couldn't save the change. Please try again.";
}
