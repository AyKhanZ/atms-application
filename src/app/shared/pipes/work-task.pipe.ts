import { Pipe, PipeTransform } from '@angular/core';
import { WorkItemKind } from '../../core/models/work-items';
import { isOverdueTask } from '../../core/utils/deadline.utils';
import { workTaskKind } from '../../core/utils/work-task.utils';

/** Task or Subtask, for `app-work-item-ref` in a template. */
@Pipe({ name: 'taskKind' })
export class TaskKindPipe implements PipeTransform {
  transform(task: { isSubtask: boolean }): WorkItemKind.Task | WorkItemKind.Subtask {
    return workTaskKind(task);
  }
}

/** Open work past its deadline; done work never is. */
@Pipe({ name: 'isOverdueTask' })
export class IsOverdueTaskPipe implements PipeTransform {
  transform(task: { deadline?: string | null; status: { id: number } }): boolean {
    return isOverdueTask(task);
  }
}
