import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TaskLocationComponent } from '../task-location/task-location.component';
import { WorkTaskModel } from '../../../../../core/models/work-tasks';
import { WorkTaskStatus } from '../../../../../core/enums/work-task-status.enum';
import { WorkItemFactsComponent } from '../../../../../shared/components/work-item-facts/work-item-facts.component';
import { WorkItemFacts } from '../../../../../shared/components/work-item-facts/work-item-facts.model';

@Component({
  selector: 'app-task-details-tab',
  imports: [TaskLocationComponent, WorkItemFactsComponent],
  templateUrl: './task-details-tab.component.html',
  styleUrl: './task-details-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskDetailsTabComponent {
  readonly task = input.required<WorkTaskModel>();

  /** A task has no type, so that slot stays empty and the block shows three rows. */
  readonly facts = computed<WorkItemFacts>(() => ({
    priority: this.task().priority,
    assignee: this.task().assignee,
    deadline: this.task().deadline,
    closed: this.task().status.id === WorkTaskStatus.Done,
  }));
}
