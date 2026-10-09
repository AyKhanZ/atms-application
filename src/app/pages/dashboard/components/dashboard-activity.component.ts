import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { currentLanguage } from '../../../core/i18n/active-language';
import { DashboardActivityModel } from '../../../core/models/dashboard';
import { WorkItemRefModel } from '../../../core/models/work-items';
import { HistoryTimePipe } from '../../../shared/pipes/history.pipe';
import { PersonShortNamePipe } from '../../../shared/pipes/person-name.pipe';
import { WorkItemRefComponent } from '../../../shared/components/work-item-ref/work-item-ref.component';
import { dashboardActivityLine } from '../dashboard-activity.utils';

@Component({
  selector: 'app-dashboard-activity',
  imports: [HistoryTimePipe, PersonShortNamePipe, WorkItemRefComponent, TranslocoDirective],
  templateUrl: './dashboard-activity.component.html',
  styleUrl: './dashboard-activity.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardActivityComponent {
  private readonly transloco = inject(TranslocoService);
  readonly activities = input.required<DashboardActivityModel[]>();
  readonly selected = output<WorkItemRefModel>();
  readonly rows = computed(() => {
    currentLanguage();
    return this.activities().map((item) => ({
      item,
      line: dashboardActivityLine(item, (key, params) => this.transloco.translate(key, params)),
    }));
  });
}
