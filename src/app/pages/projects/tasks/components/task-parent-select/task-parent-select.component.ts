import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { Subject, catchError, exhaustMap, map, merge, of, startWith, switchMap } from 'rxjs';
import { LabelForDirective } from '../../../../../core/directives/label-for.directive';
import { WorkTicketsService } from '../../../../../core/services/work-tickets.service';
import { WorkTasksService } from '../../../../../core/services/work-tasks.service';
import {
  TaskParentOption,
  groupParentOptions,
  taskParentOption,
  ticketParentOption,
} from './task-parent-option';

@Component({
  selector: 'app-task-parent-select',
  imports: [FormsModule, SelectModule, ButtonModule, LabelForDirective],
  templateUrl: './task-parent-select.component.html',
  styleUrl: './task-parent-select.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskParentSelectComponent {
  readonly projectId = input.required<string>();
  readonly ticketId = input.required<string>();
  readonly isSubtask = input(false);
  readonly selection = input<TaskParentOption | null>(null);
  readonly disabled = input(false);
  readonly invalid = input(false);
  readonly selected = output<TaskParentOption>();

  private readonly tickets = inject(WorkTicketsService);
  private readonly tasks = inject(WorkTasksService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly more = new Subject<void>();
  private readonly retry = new Subject<void>();
  private readonly scope = computed(() => ({
    projectId: this.projectId(),
    ticketId: this.ticketId(),
    isSubtask: this.isSubtask(),
  }));
  readonly options = signal<TaskParentOption[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal(false);
  readonly hasMore = signal(false);
  private cursor: string | null = null;
  readonly groups = computed(() => {
    const selected = this.selection();
    return groupParentOptions(selected ? [selected, ...this.options()] : this.options());
  });

  constructor() {
    merge(toObservable(this.scope), this.retry)
      .pipe(
        switchMap(() => {
          const scope = this.scope();
          this.options.set([]);
          this.cursor = null;
          this.hasMore.set(false);
          return this.more.pipe(
            startWith(undefined),
            exhaustMap(() => {
              this.loading.set(true);
              this.loadError.set(false);
              const request = scope.isSubtask
                ? this.tasks
                    // Project-wide, not just the current ticket: a subtask can be re-parented to
                    // any task in the plan, the same way a ticket can move to any milestone.
                    .getWorkTasks(scope.projectId, {
                      rootTasksOnly: true,
                      pageSize: 50,
                      cursor: this.cursor,
                    })
                    .pipe(
                      map((page) => ({
                        ...page,
                        items: page.items
                          .filter((task) => !task.parentWorkTaskId && !task.isSubtask)
                          .map(taskParentOption),
                      })),
                    )
                : this.tickets
                    .getWorkTickets(scope.projectId, {
                      pageSize: 50,
                      cursor: this.cursor,
                    })
                    .pipe(map((page) => ({ ...page, items: page.items.map(ticketParentOption) })));
              return request.pipe(
                catchError(() => {
                  this.loadError.set(true);
                  return of(null);
                }),
              );
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((page) => {
        this.loading.set(false);
        if (!page) return;
        this.options.update((items) => [...items, ...page.items]);
        this.cursor = page.nextCursor;
        this.hasMore.set(page.hasMore);
      });
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
    if (this.hasMore() && !this.loading()) this.more.next();
  }

  retryLoad(event: Event): void {
    event.stopPropagation();
    if (!this.loading()) this.retry.next();
  }
}
