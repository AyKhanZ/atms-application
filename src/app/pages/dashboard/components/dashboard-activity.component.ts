import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DashboardActivityModel, DashboardRefModel } from '../../../core/models/dashboard';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ProfileAvatarComponent } from '../../../shared/components/profile-avatar/profile-avatar.component';
import { HistoryTimePipe } from '../../../shared/pipes/history.pipe';
import { PersonInitialsPipe, PersonNamePipe } from '../../../shared/pipes/person-name.pipe';
import { dashboardActivityText } from '../dashboard-activity.utils';

@Component({
  selector: 'app-dashboard-activity',
  imports: [
    EmptyStateComponent,
    ProfileAvatarComponent,
    HistoryTimePipe,
    PersonInitialsPipe,
    PersonNamePipe,
  ],
  templateUrl: './dashboard-activity.component.html',
  styleUrl: './dashboard-activity.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardActivityComponent {
  readonly activities = input.required<DashboardActivityModel[]>();
  readonly selected = output<DashboardRefModel>();
  readonly rows = computed(() =>
    this.activities().map((item) => ({
      item,
      text: dashboardActivityText(item),
    })),
  );
}
