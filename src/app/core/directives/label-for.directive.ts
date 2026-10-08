import { Directive, HostListener, inject, input } from '@angular/core';
import { DOCUMENT } from '@angular/common';

// label click focuses the primeng control, <label for> doesnt work since p-select is a span
// use with ariaLabelledBy on the control
@Directive({
  selector: '[appLabelFor]',
})
export class LabelForDirective {
  readonly appLabelFor = input.required<string>();

  private readonly document = inject(DOCUMENT);

  @HostListener('click')
  focusTarget(): void {
    const target = this.document.getElementById(this.appLabelFor());
    target?.focus();
  }
}
