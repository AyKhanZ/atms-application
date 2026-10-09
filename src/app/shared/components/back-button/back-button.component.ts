import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { currentLanguage } from '../../../core/i18n/active-language';

@Component({
  selector: 'app-back-button',
  templateUrl: './back-button.component.html',
  styleUrl: './back-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackButtonComponent {
  private readonly transloco = inject(TranslocoService);
  readonly label = input<string | undefined>(undefined);
  readonly back = output<void>();
  readonly text = computed(() => {
    currentLanguage();
    return this.label() ?? this.transloco.translate('common.back');
  });
}
