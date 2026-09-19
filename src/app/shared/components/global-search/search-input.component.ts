import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import { InputClearComponent } from '../input-clear/input-clear.component';

@Component({
  selector: 'app-search-input',
  imports: [InputClearComponent],
  template: `
    <div class="search-input">
      <i class="pi pi-search" aria-hidden="true"></i>
      <input
        #field
        type="text"
        autocomplete="off"
        spellcheck="false"
        maxlength="100"
        aria-label="Search projects, tickets, tasks and subtasks by code or title"
        placeholder="Search by code or title"
        [value]="value()"
        [attr.aria-expanded]="expanded()"
        [attr.aria-controls]="expanded() ? 'global-search-results' : null"
        (input)="valueChange.emit(field.value)"
        (focus)="focused.emit()"
        (click)="focused.emit()"
      />
      @if (value().length > 0) {
        <app-input-clear (cleared)="clear()" />
      }
    </div>
  `,
  styleUrl: './search-input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchInputComponent {
  readonly value = input('');
  readonly expanded = input(false);
  readonly valueChange = output<string>();
  readonly focused = output<void>();
  private readonly field = viewChild<ElementRef<HTMLInputElement>>('field');

  focus(): void {
    this.field()?.nativeElement.focus({ preventScroll: true });
  }

  clear(): void {
    this.valueChange.emit('');
    this.focus();
  }
}
