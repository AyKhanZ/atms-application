import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { TooltipModule } from 'primeng/tooltip';
import { AppLanguage, UI_LANGUAGES } from '../../../core/i18n/active-language';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-language-switcher',
  imports: [MenuModule, TooltipModule],
  templateUrl: './language-switcher.component.html',
  styleUrl: './language-switcher.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.instant]': 'mode() === "instant"',
  },
})
export class LanguageSwitcherComponent {
  private readonly language = inject(LanguageService);
  private readonly transloco = inject(TranslocoService);

  readonly mode = input<'reload' | 'instant'>('reload');
  readonly open = signal(false);
  readonly code = computed(() => this.language.current().toUpperCase());
  readonly label = computed(() => {
    this.language.current();
    return this.transloco.translate('language.label');
  });
  readonly items = computed<MenuItem[]>(() => {
    const current = this.language.current();
    return UI_LANGUAGES.map((language) => ({
      label: language.nativeName,
      icon: 'pi pi-check',
      styleClass: language.code === current ? 'language-menu__current' : 'language-menu__idle',
      command: () => this.pick(language.code),
    }));
  });

  pick(code: AppLanguage): void {
    if (code === this.language.current()) return;
    if (this.mode() === 'instant') {
      void this.language.use(code);
      return;
    }
    void this.language.switch(code);
  }
}
