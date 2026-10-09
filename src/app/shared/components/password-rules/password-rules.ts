import { Component, computed, inject, input } from '@angular/core';
import { NgClass } from '@angular/common';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { currentLanguage } from '../../../core/i18n/active-language';

interface PasswordRule {
  label: string;
  met: boolean;
}

@Component({
  selector: 'app-password-rules',
  imports: [NgClass, TranslocoDirective],
  templateUrl: './password-rules.html',
  styleUrl: './password-rules.scss',
})
export class PasswordRules {
  private readonly transloco = inject(TranslocoService);
  password = input.required<string>();
  confirmPassword = input.required<string>();

  rules = computed<PasswordRule[]>(() => {
    currentLanguage();
    const p = this.password();
    const cp = this.confirmPassword();

    return [
      { label: this.transloco.translate('validation.minLength', { min: 10 }), met: p.length >= 10 },
      { label: this.transloco.translate('validation.uppercase'), met: /[A-Z]/.test(p) },
      { label: this.transloco.translate('validation.lowercase'), met: /[a-z]/.test(p) },
      { label: this.transloco.translate('validation.digit'), met: /[0-9]/.test(p) },
      { label: this.transloco.translate('validation.symbol'), met: /[!@#$%^&*()\-_+=]/.test(p) },
      { label: this.transloco.translate('validation.passwordsMatch'), met: !!p && p === cp },
    ];
  });
}
