import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { LabelForDirective } from '../../../../../core/directives/label-for.directive';
import { WorkTasksStoreActions, WorkTasksStoreSelectors } from '../../../../../store/work-tasks';
import {
  WorkTicketsStoreActions,
  WorkTicketsStoreSelectors,
} from '../../../../../store/work-tickets';
import {
  TaskParentOption,
  groupParentOptions,
  taskParentOption,
  ticketParentOption,
} from './task-parent-option';
import { WorkItemRefComponent } from '../../../../../shared/components/work-item-ref/work-item-ref.component';
import { WorkItemKind } from '../../../../../core/models/work-items';

@Component({
  selector: 'app-task-parent-select',
  imports: [WorkItemRefComponent, FormsModule, SelectModule, ButtonModule, LabelForDirective],
  templateUrl: './task-parent-select.component.html',
  styleUrl: './task-parent-select.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskParentSelectComponent implements OnDestroy {
  protected readonly kinds = WorkItemKind;
  /** A subtask hangs under a task, a task under a ticket. */
  protected readonly parentKind = computed(() =>
    this.isSubtask() ? WorkItemKind.Task : WorkItemKind.Ticket,
  );
  readonly projectId = input.required<string>();
  readonly ticketId = input.required<string>();
  readonly isSubtask = input(false);
  readonly selection = input<TaskParentOption | null>(null);
  readonly disabled = input(false);
  readonly invalid = input(false);
  readonly selected = output<TaskParentOption>();

  private readonly store = inject(Store);
  private readonly ticketPages = this.store.selectSignal(WorkTicketsStoreSelectors.getPages);
  private readonly taskPages = this.store.selectSignal(WorkTasksStoreSelectors.getPages);
  private readonly scope = computed(() => ({
    projectId: this.projectId(),
    ticketId: this.ticketId(),
    isSubtask: this.isSubtask(),
  }));
  private readonly requestKey = computed(() => {
    const scope = this.scope();
    return `parent:${scope.projectId}:${scope.ticketId}:${scope.isSubtask ? 'tasks' : 'tickets'}`;
  });
  private readonly page = computed(() =>
    this.scope().isSubtask
      ? this.taskPages()[this.requestKey()]
      : this.ticketPages()[this.requestKey()],
  );
  readonly options = computed<TaskParentOption[]>(() => {
    if (this.scope().isSubtask) {
      const page = this.taskPages()[this.requestKey()];
      return (page?.items ?? [])
        .filter((task) => !task.parentWorkTask?.id && !task.isSubtask)
        .map(taskParentOption);
    }

    return (this.ticketPages()[this.requestKey()]?.items ?? []).map(ticketParentOption);
  });
  readonly loading = computed(() => this.page()?.loading ?? true);
  readonly loadError = computed(() => Boolean(this.page()?.error));
  readonly hasMore = computed(() => this.page()?.hasMore ?? false);
  readonly groups = computed(() => {
    const selected = this.selection();
    return groupParentOptions(selected ? [selected, ...this.options()] : this.options());
  });

  constructor() {
    effect(() => {
      this.load(false);
    });
  }

  ngOnDestroy(): void {
    const requestKey = this.requestKey();
    this.store.dispatch(
      this.scope().isSubtask
        ? WorkTasksStoreActions.clearPage({ requestKey })
        : WorkTicketsStoreActions.clearPage({ requestKey }),
    );
  }

  /** Group, then milestone, then ticket — the same icons the Plan tab and Location use. */
  groupLevelIcon(index: number): string {
    return ['pi-folder', 'pi-flag', 'pi-ticket'][index] ?? 'pi-ticket';
  }

  /** Indent of one tree level, in rem. Matches the step the guide line is drawn at in the
   *  stylesheet, so widening the hierarchy means changing both together. */
  readonly treeStep = 1.2;

  /** One step deeper than the last header line: a ticket sits under Group › Milestone, a task
   *  one level further under its ticket. */
  readonly optionDepth = computed(() => (this.isSubtask() ? 3 : 2));
  readonly optionIndent = computed(() => this.levelIndent(this.optionDepth()));

  /** Left offset of a row that sits `depth` levels deep, in rem. */
  levelIndent(depth: number): number {
    return depth * this.treeStep;
  }

  choose(id: string): void {
    const option = this.groups()
      .flatMap((group) => group.items)
      .find((item) => item.id === id);
    if (option && !this.disabled()) this.selected.emit(option);
  }

  loadMore(event: Event): void {
    event.stopPropagation();
    if (this.hasMore() && !this.loading()) this.load(true);
  }

  retryLoad(event: Event): void {
    event.stopPropagation();
    if (!this.loading()) this.load(false);
  }

  private load(append: boolean): void {
    const scope = this.scope();
    const requestKey = this.requestKey();
    const cursor = append ? (this.page()?.nextCursor ?? null) : null;
    if (scope.isSubtask) {
      this.store.dispatch(
        WorkTasksStoreActions.loadTasks({
          requestKey,
          projectId: scope.projectId,
          append,
          filter: { rootTasksOnly: true, pageSize: 50, cursor },
        }),
      );
      return;
    }

    this.store.dispatch(
      WorkTicketsStoreActions.loadTickets({
        requestKey,
        projectId: scope.projectId,
        append,
        filter: { pageSize: 50, cursor },
      }),
    );
  }
}
