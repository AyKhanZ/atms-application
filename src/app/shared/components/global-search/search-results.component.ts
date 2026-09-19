import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { GlobalSearchItemModel } from '../../../core/models/global-search';
import { WorkItemKind } from '../../../core/models/work-items';
import { SearchResultRowComponent } from './search-result-row.component';

export interface SearchResultGroup {
  type: WorkItemKind;
  label: string;
  items: GlobalSearchItemModel[];
  hasMore: boolean;
}

@Component({
  selector: 'app-search-results',
  imports: [SearchResultRowComponent],
  templateUrl: './search-results.component.html',
  styleUrl: './search-results.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchResultsComponent {
  readonly groups = input.required<SearchResultGroup[]>();
  readonly query = input('');
  readonly activeId = input<string | null>(null);
  readonly choose = output<GlobalSearchItemModel>();
  /** The row under the pointer, so the owner keeps one highlight for mouse and keyboard alike. */
  readonly point = output<{ id: string; event: MouseEvent }>();
  readonly showAll = output<WorkItemKind>();
}
