import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { LayoutService } from '../../../../../core/services/layout.service';
import { renderDocument } from '../../attachment-content';

/**
 * A .docx drawn as pages, the way Word shows it. A page wider than the dialog — a landscape A4 —
 * narrows to fit and its text wraps; on a phone the page reflows to the screen.
 */
@Component({
  selector: 'app-attachment-document-view',
  template: `
    @if (rendering()) {
      <div class="document-state" role="status">
        <i class="pi pi-spin pi-spinner" aria-hidden="true"></i>
        <span>Opening the document...</span>
      </div>
    }
    <div #page class="document" [class.document--hidden]="rendering()"></div>
  `,
  styleUrl: './attachment-document-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttachmentDocumentViewComponent {
  private readonly layout = inject(LayoutService);

  readonly blob = input.required<Blob>();
  readonly failed = output<string>();

  readonly rendering = signal(true);
  private readonly page = viewChild.required<ElementRef<HTMLElement>>('page');

  constructor() {
    effect(() => {
      const blob = this.blob();
      const container = this.page().nativeElement;
      untracked(() => {
        this.rendering.set(true);
        renderDocument(blob, container, this.layout.isPhone())
          .then(() => this.rendering.set(false))
          .catch(() =>
            this.failed.emit('This document could not be shown. Download it to open it in Word.'),
          );
      });
    });
  }
}
