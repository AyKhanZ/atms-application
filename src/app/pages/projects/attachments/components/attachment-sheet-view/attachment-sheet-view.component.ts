import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { MAX_SHEET_COLUMNS, MAX_SHEET_ROWS, SheetPreview } from '../../attachment-content';

// cells are plain text, no formula runs
@Component({
  selector: 'app-attachment-sheet-view',
  templateUrl: './attachment-sheet-view.component.html',
  styleUrl: './attachment-sheet-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttachmentSheetViewComponent {
  readonly sheets = input.required<SheetPreview[]>();

  protected readonly maxRows = MAX_SHEET_ROWS;
  protected readonly maxColumns = MAX_SHEET_COLUMNS;
  readonly selected = signal(0);
  readonly sheet = computed(() => this.sheets()[Math.min(this.selected(), this.sheets().length - 1)]);
}
