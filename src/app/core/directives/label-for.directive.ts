import { Directive, HostListener, inject, input } from '@angular/core';
import { DOCUMENT } from '@angular/common';

/**
 * Makes a label focus a PrimeNG control the way `<label for>` focuses a native one.
 *
 * `<label for>` only binds to a labelable form element. `p-select` renders a
 * `<span role="combobox">`, so the browser ignores the association: the accessible name can be
 * restored with `ariaLabelledBy`, but clicking the label still does nothing. This restores that
 * half of the behaviour.
 *
 * Use it together with `ariaLabelledBy` on the control:
 *
 * ```html
 * <label id="taskPriorityLabel" appLabelFor="taskPriority">Priority</label>
 * <p-select inputId="taskPriority" ariaLabelledBy="taskPriorityLabel" />
 * ```
 */
@Directive({
  selector: '[appLabelFor]',
})
export class LabelForDirective {
  /** `inputId` of the control to focus. */
  readonly appLabelFor = input.required<string>();

  private readonly document = inject(DOCUMENT);

  @HostListener('click')
  focusTarget(): void {
    const target = this.document.getElementById(this.appLabelFor());
    target?.focus();
  }
}
