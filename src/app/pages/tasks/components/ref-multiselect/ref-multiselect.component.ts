import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MultiSelectFilterEvent, MultiSelectModule } from 'primeng/multiselect';
import { WorkItemRefComponent } from '../../../../shared/components/work-item-ref/work-item-ref.component';
import { filterPanelStyle } from '../task-filters/filter-option';
import { FilterSummaryPipe } from '../task-filters/filter-summary.pipe';
import { RemoteOptions } from '../../remote-options';

/** How close to the end of the list the next page is asked for, so it arrives before it is needed. */
const nearEnd = 48;

/**
 * A searchable pick of projects or tickets, each drawn as everywhere else: the kind's icon and code
 * in the kind's colour, then the title. The options come from the server a page at a time: typing
 * searches there, scrolling to the end reads the next page. The Project and Ticket filters are this
 * same control.
 */
@Component({
  selector: 'app-ref-multiselect',
  imports: [FormsModule, MultiSelectModule, WorkItemRefComponent, FilterSummaryPipe],
  templateUrl: './ref-multiselect.component.html',
  styleUrl: './ref-multiselect.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RefMultiselectComponent {
  private readonly document = inject(DOCUMENT);
  private list: HTMLElement | null = null;

  /** The id a `<label for>` points at. */
  readonly inputId = input.required<string>();
  readonly labelledBy = input.required<string>();
  readonly placeholder = input('All');
  readonly source = input<RemoteOptions | null>(null);
  readonly value = input<string[]>([]);
  readonly disabled = input(false);
  readonly valueChange = output<string[]>();

  protected readonly panelStyle = filterPanelStyle;
  /** The panel lives on the body; its own class is how this control finds its list again. */
  protected readonly panelClass = computed(() => `ref-multiselect-panel--${this.inputId()}`);
  protected readonly options = computed(() => this.source()?.options() ?? []);
  protected readonly loading = computed(() => this.source()?.loading() ?? false);

  private readonly onScroll = (): void => {
    const list = this.list;
    if (list && list.scrollTop + list.clientHeight >= list.scrollHeight - nearEnd) {
      this.source()?.more();
    }
  };

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stopWatching());
  }

  protected search(event: MultiSelectFilterEvent): void {
    this.source()?.search(event.filter ?? '');
  }

  protected startWatching(): void {
    this.stopWatching();
    this.list = this.document.querySelector<HTMLElement>(
      `.${this.panelClass()} .p-multiselect-list-container`,
    );
    this.list?.addEventListener('scroll', this.onScroll, { passive: true });
  }

  protected stopWatching(): void {
    this.list?.removeEventListener('scroll', this.onScroll);
    this.list = null;
  }
}
