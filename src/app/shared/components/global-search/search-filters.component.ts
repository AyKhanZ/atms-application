import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { WorkItemKind } from '../../../core/models/work-items';

export interface SearchFilterChip<T = WorkItemKind | null> {
  type: T;
  label: string;
  disabled: boolean;
}

@Component({
  selector: 'app-search-filters',
  template: `
    <div class="filters" role="tablist" [attr.aria-label]="label()">
      @for (chip of chips(); track chip.label) {
        <button
          type="button"
          role="tab"
          class="filters__chip"
          [class.filters__chip--active]="chip.type === active()"
          [attr.aria-selected]="chip.type === active()"
          [disabled]="chip.disabled"
          (click)="select.emit(chip.type)"
        >
          {{ chip.label }}
        </button>
      }
    </div>
  `,
  styleUrl: './search-filters.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchFiltersComponent<T = WorkItemKind | null> {
  readonly chips = input.required<SearchFilterChip<T>[]>();
  readonly active = input<T | null>(null);
  readonly label = input('Result types');
  readonly select = output<T>();
}
