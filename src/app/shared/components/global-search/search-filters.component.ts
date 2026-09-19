import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { WorkItemKind } from '../../../core/models/work-items';

export interface SearchFilterChip {
  type: WorkItemKind | null;
  label: string;
  disabled: boolean;
}

@Component({
  selector: 'app-search-filters',
  template: `
    <div class="filters" role="tablist" aria-label="Result types">
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
export class SearchFiltersComponent {
  readonly chips = input.required<SearchFilterChip[]>();
  readonly active = input<WorkItemKind | null>(null);
  readonly select = output<WorkItemKind | null>();
}
