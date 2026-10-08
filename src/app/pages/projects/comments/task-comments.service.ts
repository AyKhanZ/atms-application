import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { EMPTY, catchError, switchMap } from 'rxjs';
import { WorkTaskModel } from '../../../core/models/work-tasks';
import { RealtimeService } from '../../../core/services/realtime.service';
import { WorkTasksService } from '../../../core/services/work-tasks.service';
import { CommentsStoreActions, commentsKey } from '../../../store/comments';

// an edit changes nothing
export function commentsCountAfter(
  count: number,
  action: 'created' | 'updated' | 'deleted',
): number {
  if (action === 'created') return count + 1;
  if (action === 'deleted') return Math.max(0, count - 1);
  return count;
}

// list stays in the store while the section is folded so opening shows it at once
// one per task page
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
    // pushes missed while offline: read the count again
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
