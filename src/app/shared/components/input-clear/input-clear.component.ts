import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { currentLanguage } from '../../../core/i18n/active-language';

// browser cross on type="search" is blue, has no hover and doesnt exist in firefox
@Component({
  selector: 'app-input-clear',
  template: `
    <button
      type="button"
      class="input-clear"
      [attr.aria-label]="text()"
      (mousedown)="$event.preventDefault()"
      (click)="cleared.emit()"
    >
      <i class="pi pi-times" aria-hidden="true"></i>
    </button>
  `,
  styleUrl: './input-clear.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputClearComponent {
  private readonly transloco = inject(TranslocoService);
  readonly label = input<string | undefined>(undefined);
  readonly cleared = output<void>();
  readonly text = computed(() => {
    currentLanguage();
    return this.label() ?? this.transloco.translate('common.clearSearch');
  });
}
