import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { currentLanguage } from '../../../core/i18n/active-language';

@Component({
  selector: 'app-filter-toggle-button',
  templateUrl: './filter-toggle-button.component.html',
  styleUrl: './filter-toggle-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilterToggleButtonComponent {
  private readonly transloco = inject(TranslocoService);
  readonly active = input(false);
  readonly count = input(0);
  readonly label = input<string | undefined>(undefined);
  readonly disabled = input(false);
  readonly clicked = output<void>();
  readonly text = computed(() => {
    currentLanguage();
    return this.label() ?? this.transloco.translate('common.filter');
  });
}
