import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective } from '@jsverse/transloco';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { DashboardPeriod } from '../../../core/models/dashboard';
import { DashboardPeriodOption } from '../../../core/utils/dashboard-query.utils';

@Component({
  selector: 'app-dashboard-toolbar',
  imports: [FormsModule, SelectModule, DatePickerModule, TranslocoDirective],
  templateUrl: './dashboard-toolbar.component.html',
  styleUrl: './dashboard-toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'dashboard-toolbar',
    '[class.dashboard-toolbar--custom]': "period() === 'custom'",
  },
})
export class DashboardToolbarComponent {
  readonly projectOptions = input.required<{ id: string; label: string }[]>();
  readonly projectId = input('');
  readonly periodOptions = input.required<DashboardPeriodOption[]>();
  readonly period = input.required<DashboardPeriod>();
  readonly customFrom = input<Date | null>(null);
  readonly customTo = input<Date | null>(null);
  readonly fromMinDate = input<Date | null>(null);
  readonly fromMaxDate = input<Date | null>(null);
  readonly toMinDate = input<Date | null>(null);
  readonly toMaxDate = input<Date | null>(null);
  readonly customError = input<string | null>(null);
  readonly showUpdated = input(false);
  readonly updatedText = input('');
  readonly loading = input(false);

  readonly projectChange = output<string>();
  readonly projectSearch = output<{ filter?: string }>();
  readonly periodChange = output<DashboardPeriod>();
  readonly customFromChange = output<Date | null>();
  readonly customToChange = output<Date | null>();
  readonly apply = output<void>();
  readonly refresh = output<void>();
}
