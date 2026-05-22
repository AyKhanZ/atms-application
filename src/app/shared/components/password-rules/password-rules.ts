import { Component, computed, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { NgClass } from '@angular/common';

interface PasswordRule {
  label: string;
  met: boolean;
}

@Component({
  selector: 'app-password-rules',
  imports: [MatIcon, NgClass],
  templateUrl: './password-rules.html',
  styleUrl: './password-rules.scss',
})
export class PasswordRules {
  password = input.required<string>();
  confirmPassword = input.required<string>();

  rules = computed<PasswordRule[]>(() => {
    const p = this.password();
    const cp = this.confirmPassword();

    return [
      { label: 'At least 10 characters', met: p.length >= 10 },
      { label: 'Contains uppercase letter (e.g. A, B)', met: /[A-Z]/.test(p) },
      { label: 'Contains lowercase letter (e.g. a, b)', met: /[a-z]/.test(p) },
      { label: 'Contains a number (e.g. 1, 2, 3)', met: /[0-9]/.test(p) },
      { label: 'Contains a symbol (e.g. @, #, !)', met: /[!@#$%^&*()\-_+=]/.test(p) },
      { label: 'Both passwords match', met: !!p && p === cp },
    ];
  });
}
