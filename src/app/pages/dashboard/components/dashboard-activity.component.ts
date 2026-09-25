import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DashboardActivityModel, DashboardRefModel } from '../../../core/models/dashboard';
import { HistoryTimePipe } from '../../../shared/pipes/history.pipe';
import { PersonShortNamePipe } from '../../../shared/pipes/person-name.pipe';
import { WorkItemRefComponent } from '../../../shared/components/work-item-ref/work-item-ref.component';
import { dashboardActivityLine } from '../dashboard-activity.utils';

@Component({
  selector: 'app-dashboard-activity',
  imports: [HistoryTimePipe, PersonShortNamePipe, WorkItemRefComponent],
  templateUrl: './dashboard-activity.component.html',
  styleUrl: './dashboard-activity.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardActivityComponent {
  readonly activities = input.required<DashboardActivityModel[]>();
  readonly selected = output<DashboardRefModel>();
  readonly rows = computed(() =>
    this.activities().map((item) => ({ item, line: dashboardActivityLine(item) })),
  );
}
