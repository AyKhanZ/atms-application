import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { EMPTY, catchError, switchMap } from 'rxjs';
import { WorkTaskModel } from '../../../core/models/work-tasks';
import { RealtimeService } from '../../../core/services/realtime.service';
import { WorkTasksService } from '../../../core/services/work-tasks.service';
import { CommentsStoreActions, commentsKey } from '../../../store/comments';

/** Every comment added or deleted, by anyone; an edit changes nothing. */
export function commentsCountAfter(
  count: number,
  action: 'created' | 'updated' | 'deleted',
): number {
  if (action === 'created') return count + 1;
  if (action === 'deleted') return Math.max(0, count - 1);
  return count;
}

/**
 * The comments of the task on the page, for as long as the page shows it: the number under the
 * title, kept live, and the discussion's list, kept in the store while the section is folded — so
 * opening it again shows the comments at once instead of reading them anew. One per task page.
 */
@Injectable()
export class TaskCommentsService {
  private readonly realtime = inject(RealtimeService);
  private readonly tasks = inject(WorkTasksService);
  private readonly store = inject(Store);
  private watched: Pick<WorkTaskModel, 'id' | 'workProjectId'> | null = null;

  readonly count = signal(0);

  constructor() {
    this.realtime.commentChanged$.pipe(takeUntilDestroyed()).subscribe(({ workTaskId, action }) => {
      if (workTaskId === this.watched?.id) {
        this.count.update((count) => commentsCountAfter(count, action));
      }
    });
    // Pushes missed while the connection was down: the number is read again with the task.
    this.realtime.reconnected$
      .pipe(
        switchMap(() => {
          const task = this.watched;
          return task
            ? this.tasks.getWorkTask(task.workProjectId, task.id).pipe(catchError(() => EMPTY))
            : EMPTY;
        }),
        takeUntilDestroyed(),
      )
      .subscribe((task) => {
        if (task.id === this.watched?.id) this.count.set(task.commentsCount ?? 0);
      });
    inject(DestroyRef).onDestroy(() => this.watch(null));
  }

  /** The task now on the page, or null while none is. */
  watch(task: Pick<WorkTaskModel, 'id' | 'workProjectId' | 'commentsCount'> | null): void {
    this.count.set(task?.commentsCount ?? 0);
    if (this.watched?.id === (task?.id ?? null)) return;

    if (this.watched) {
      void this.realtime.unwatchTask(this.watched.id);
      this.store.dispatch(CommentsStoreActions.clear({ listKey: commentsKey(this.watched.id) }));
    }
    this.watched = task ? { id: task.id, workProjectId: task.workProjectId } : null;
    if (task) void this.realtime.watchTask(task.workProjectId, task.id);
  }
}
