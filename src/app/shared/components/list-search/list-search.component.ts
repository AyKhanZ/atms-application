import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { InputClearComponent } from '../input-clear/input-clear.component';

@Component({
  selector: 'app-list-search',
  imports: [FormsModule, InputTextModule, InputClearComponent],
  templateUrl: './list-search.component.html',
  styleUrl: './list-search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListSearchComponent {
  readonly value = input('');
  readonly placeholder = input('Search');
  readonly maxLength = input(100);
  readonly disabled = input(false);
  readonly valueChange = output<string>();

  clear(field: HTMLInputElement): void {
    this.valueChange.emit('');
    field.focus();
  }
}
