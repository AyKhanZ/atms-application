import { Pipe, PipeTransform } from '@angular/core';
import { FilterOption } from './filter-option';

/**
 * "Payment Gateway +1": the first choice by name, so the field says what it holds. Empty when
 * nothing is chosen — the placeholder ("All", "Anyone") is drawn by the dropdown itself.
 */
@Pipe({ name: 'filterSummary' })
export class FilterSummaryPipe implements PipeTransform {
  transform(selected: readonly FilterOption<unknown>[] | null | undefined): string {
    if (!selected?.length) return '';
    const [first] = selected;
    const name = first.ref?.title ?? first.label;
    return selected.length > 1 ? `${name} +${selected.length - 1}` : name;
  }
}
