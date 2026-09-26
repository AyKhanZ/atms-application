import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DictionaryModel } from '../../../core/models/dictionary.model';
import { DashboardDeadlineModel, DashboardRefModel } from '../../../core/models/dashboard';
import { WorkItemKind } from '../../../core/models/work-items';
import { WorkItemPriorityComponent } from '../../../shared/components/work-item-priority/work-item-priority.component';
import { WorkItemRefComponent } from '../../../shared/components/work-item-ref/work-item-ref.component';

@Component({
  selector: 'app-dashboard-deadlines',
  imports: [DatePipe, WorkItemPriorityComponent, WorkItemRefComponent],
  templateUrl: './dashboard-deadlines.component.html',
  styleUrl: './dashboard-deadlines.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardDeadlinesComponent {
  protected readonly task = WorkItemKind.Task;
  protected readonly subtask = WorkItemKind.Subtask;
  readonly deadlines = input.required<DashboardDeadlineModel[]>();
  /** Every open task due in the next 7 days; the list shows only the nearest of them. */
  readonly total = input.required<number>();
  readonly priorities = input<DictionaryModel[]>([]);
  readonly selected = output<DashboardRefModel>();
  readonly showAll = output<void>();
  readonly rows = computed(() =>
    this.deadlines().map((item) => ({
      item,
      priority: this.priorities().find((priority) => priority.id === item.priority.id) ?? {
        id: item.priority.id,
        code: item.priority.name,
        name: item.priority.name,
      },
    })),
  );
}
