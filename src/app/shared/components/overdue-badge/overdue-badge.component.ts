import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { daysLate, lateLabel } from '../../../core/utils/deadline.utils';

// solid, not tinted, it sits on a tinted card; nothing for a deadline not passed, done is the callers call
@Component({
  selector: 'app-overdue-badge',
  host: { '[class.is-compact]': 'compact()' },
  template: `
    @if (days() > 0) {
      <span class="overdue-badge" [attr.title]="label()" [attr.aria-label]="label()">
        @if (!compact()) {
          <i class="pi pi-clock" aria-hidden="true"></i>
        }
        {{ short() }}{{ compact() ? '' : ' overdue' }}
      </span>
    }
  `,
  styleUrl: './overdue-badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverdueBadgeComponent {
  readonly deadline = input<string | null | undefined>(null);
  // "3w" only, for a calendar chip
  readonly compact = input(false);

  protected readonly days = computed(() => daysLate(this.deadline()));
  protected readonly short = computed(() => lateLabel(this.days()));
  protected readonly label = computed(
    () => `Overdue by ${this.days()} day${this.days() === 1 ? '' : 's'}`,
  );
}
