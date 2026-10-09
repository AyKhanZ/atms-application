import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { currentLanguage } from '../../../core/i18n/active-language';

@Component({
  selector: 'app-create-button',
  templateUrl: './create-button.component.html',
  styleUrl: './create-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateButtonComponent {
  private readonly transloco = inject(TranslocoService);
  readonly label = input('Create');
  readonly title = input<string | undefined>(undefined);
  readonly accessibleTitle = computed(() => {
    currentLanguage();
    return this.title() ?? this.transloco.translate('common.createNewItem');
  });
  readonly disabled = input(false);
  readonly clicked = output<void>();
}
