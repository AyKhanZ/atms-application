import { booleanAttribute, ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { currentLanguage } from '../../../core/i18n/active-language';

@Component({
  selector: 'app-loading-state',
  template: `
    <div class="loading-state" role="status">
      <i class="pi pi-spin pi-spinner" aria-hidden="true"></i>
      <span>{{ shown() }}</span>
    </div>
  `,
  styleUrl: './loading-state.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.compact]': 'compact()' },
})
export class LoadingStateComponent {
  private readonly transloco = inject(TranslocoService);
  readonly text = input<string | undefined>(undefined);
  // one line, for lists inside a card
  readonly compact = input(false, { transform: booleanAttribute });
  readonly shown = computed(() => {
    currentLanguage();
    return this.text() ?? this.transloco.translate('common.loading');
  });
}
