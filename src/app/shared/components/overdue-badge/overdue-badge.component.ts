import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { daysLate, lateLabel } from '../../../core/utils/deadline.utils';

/**
 * "3w overdue" in a solid red pill: how far behind, not just that it is. The same pill on the
 * board, the calendar, the list and the hover card. Solid, not tinted: it sits on a tinted card or
 * row and has to stand out from it. Draws nothing for a deadline that has not passed; whether the
 * work is done is the caller's to decide.
 */
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
  /** Only "3w": for a one-line calendar chip. */
  readonly compact = input(false);

  protected readonly days = computed(() => daysLate(this.deadline()));
  protected readonly short = computed(() => lateLabel(this.days()));
  protected readonly label = computed(
    () => `Overdue by ${this.days()} day${this.days() === 1 ? '' : 's'}`,
  );
}
