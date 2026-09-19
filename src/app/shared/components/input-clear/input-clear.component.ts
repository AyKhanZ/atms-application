import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * The cross that empties a search field. One component for every field, so they all look and
 * behave alike — the browser's own cross on type="search" is blue, has no hover or pointer, and
 * does not exist at all in Firefox.
 */
@Component({
  selector: 'app-input-clear',
  template: `
    <button
      type="button"
      class="input-clear"
      [attr.aria-label]="label()"
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
  readonly label = input('Clear search');
  readonly cleared = output<void>();
}
