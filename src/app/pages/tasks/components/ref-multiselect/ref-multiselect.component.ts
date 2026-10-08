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

// ask for the next page this close to the end so it arrives in time
const nearEnd = 48;

// options come a page at a time: typing searches on the server, scrolling loads the next page
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

  readonly inputId = input.required<string>();
  readonly labelledBy = input.required<string>();
  readonly placeholder = input('All');
  readonly source = input<RemoteOptions | null>(null);
  readonly value = input<string[]>([]);
  readonly disabled = input(false);
  readonly valueChange = output<string[]>();

  protected readonly panelStyle = filterPanelStyle;
  // panel is on body, its class is how this control finds its list
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
