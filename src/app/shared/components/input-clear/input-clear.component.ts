import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

// browser cross on type="search" is blue, has no hover and doesnt exist in firefox
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
