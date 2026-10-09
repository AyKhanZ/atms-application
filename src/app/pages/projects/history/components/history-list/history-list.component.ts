import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { TooltipModule } from 'primeng/tooltip';
import { HistoryField } from '../../../../../core/enums/history-field.enum';
import { HistoryEntryModel } from '../../../../../core/models/history';
import {
  HistoryGroup,
  HistoryGroupId,
  HistorySubject,
  historyGroupKey,
} from '../../../../../core/utils/history.utils';
import {
  HistoryFieldListPipe,
  HistoryMarkerPipe,
  HistorySummaryPipe,
  HistoryTimePipe,
} from '../../../../../shared/pipes/history.pipe';
import { PersonNamePipe } from '../../../../../shared/pipes/person-name.pipe';
import { HistoryAuthorAvatarComponent } from '../history-author-avatar/history-author-avatar.component';
import { LoadMoreButtonComponent } from '../../../../../shared/components/load-more-button/load-more-button.component';
import { HistoryValueComponent } from '../history-value/history-value.component';

@Component({
  selector: 'app-history-list',
  imports: [
    HistoryAuthorAvatarComponent,
    HistoryFieldListPipe,
    HistoryMarkerPipe,
    HistorySummaryPipe,
    HistoryTimePipe,
    HistoryValueComponent,
    LoadMoreButtonComponent,
    PersonNamePipe,
    TooltipModule,
    TranslocoDirective,
  ],
  templateUrl: './history-list.component.html',
  styleUrl: './history-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryListComponent {
  protected readonly statusField = HistoryField.Status;
  protected readonly groupKey = historyGroupKey;

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly groups = input.required<HistoryGroup[]>();
  readonly selectedId = input<string | null>(null);
  readonly subject = input.required<HistorySubject>();
  readonly projectId = input.required<string>();
  readonly hasMore = input(false);
  readonly loadingMore = input(false);
  readonly loadMoreError = input<string | null>(null);

  readonly select = output<HistoryEntryModel>();
  readonly loadMore = output<void>();

  protected readonly collapsed = signal<ReadonlySet<HistoryGroupId>>(new Set());
  // rows of open groups, in drawing order
  private readonly visible = computed(() =>
    this.groups()
      .filter((group) => !this.collapsed().has(group.id))
      .flatMap((group) => group.entries),
  );

  toggle(label: HistoryGroupId): void {
    this.collapsed.update((current) => {
      const next = new Set(current);
      if (!next.delete(label)) next.add(label);
      return next;
    });
  }

  move(event: Event, entry: HistoryEntryModel, step: 1 | -1): void {
    event.preventDefault();
    const rows = this.visible();
    const next = rows[rows.findIndex((row) => row.id === entry.id) + step];
    if (!next) return;

    this.select.emit(next);
    this.host.nativeElement.querySelector<HTMLElement>(`[data-entry-id="${next.id}"]`)?.focus();
  }
}
