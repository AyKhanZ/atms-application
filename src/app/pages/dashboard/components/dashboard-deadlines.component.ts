import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { RouterLink } from '@angular/router';
import { DictionaryModel } from '../../../core/models/dictionary.model';
import { DashboardDeadlineModel } from '../../../core/models/dashboard';
import { WorkItemKind } from '../../../core/models/work-items';
import { WorkItemPriorityComponent } from '../../../shared/components/work-item-priority/work-item-priority.component';
import { WorkItemRefComponent } from '../../../shared/components/work-item-ref/work-item-ref.component';
import { WorkItemRoutePipe } from '../../../shared/pipes/work-item-route.pipe';

@Component({
  selector: 'app-dashboard-deadlines',
  imports: [
    RouterLink,
    AppDatePipe,
    WorkItemPriorityComponent,
    WorkItemRefComponent,
    WorkItemRoutePipe,
    TranslocoDirective,
  ],
  templateUrl: './dashboard-deadlines.component.html',
  styleUrl: './dashboard-deadlines.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardDeadlinesComponent {
  protected readonly task = WorkItemKind.Task;
  protected readonly subtask = WorkItemKind.Subtask;
  readonly deadlines = input.required<DashboardDeadlineModel[]>();
  // all open tasks due in 7 days, the list shows only the nearest
  readonly total = input.required<number>();
  readonly priorities = input<DictionaryModel[]>([]);
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
