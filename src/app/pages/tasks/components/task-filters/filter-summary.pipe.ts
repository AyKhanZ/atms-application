import { Pipe, PipeTransform } from '@angular/core';
import { FilterOption } from './filter-option';

// "Payment Gateway +1"; empty when nothing is chosen, the dropdown draws the placeholder
@Pipe({ name: 'filterSummary' })
export class FilterSummaryPipe implements PipeTransform {
  transform(selected: readonly FilterOption<unknown>[] | null | undefined): string {
    if (!selected?.length) return '';
    const [first] = selected;
    const name = first.ref?.title ?? first.label;
    return selected.length > 1 ? `${name} +${selected.length - 1}` : name;
  }
}
