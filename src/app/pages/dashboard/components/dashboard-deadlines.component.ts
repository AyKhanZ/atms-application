import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DictionaryModel } from '../../../core/models/dictionary.model';
import { DashboardDeadlineModel, DashboardRefModel } from '../../../core/models/dashboard';
import { WorkItemKind } from '../../../core/models/work-items';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { WorkItemPriorityComponent } from '../../../shared/components/work-item-priority/work-item-priority.component';
import { WorkItemRefComponent } from '../../../shared/components/work-item-ref/work-item-ref.component';

@Component({
  selector: 'app-dashboard-deadlines',
  imports: [DatePipe, EmptyStateComponent, WorkItemPriorityComponent, WorkItemRefComponent],
  templateUrl: './dashboard-deadlines.component.html',
  styleUrl: './dashboard-deadlines.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardDeadlinesComponent {
  protected readonly task = WorkItemKind.Task;
  protected readonly subtask = WorkItemKind.Subtask;
  readonly deadlines = input.required<DashboardDeadlineModel[]>();
  readonly priorities = input<DictionaryModel[]>([]);
  readonly selected = output<DashboardRefModel>();
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
