import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { daysLate, lateSpan } from '../../../core/utils/deadline.utils';
import { currentLanguage } from '../../../core/i18n/active-language';

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
        {{ caption() }}
      </span>
    }
  `,
  styleUrl: './overdue-badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverdueBadgeComponent {
  private readonly transloco = inject(TranslocoService);
  readonly deadline = input<string | null | undefined>(null);
  // "3w" only, for a calendar chip
  readonly compact = input(false);

  protected readonly days = computed(() => daysLate(this.deadline()));
  protected readonly short = computed(() => {
    currentLanguage();
    const { count, unit } = lateSpan(this.days());
    return this.transloco.translate(`workItem.late.${unit}`, { count });
  });
  protected readonly label = computed(() => {
    currentLanguage();
    return this.transloco.translate('workItem.overdueBy', { count: this.days() });
  });
  protected readonly caption = computed(() => {
    currentLanguage();
    return this.compact()
      ? this.short()
      : this.transloco.translate('workItem.overdueShort', { short: this.short() });
  });
}
