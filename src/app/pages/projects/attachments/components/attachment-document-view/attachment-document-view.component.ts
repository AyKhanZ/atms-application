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
 *
 * The pages live in a sandboxed iframe: no scripts (`allow-scripts` is not given), so nothing a
 * document carries can run as the signed-in user. `allow-same-origin` only lets the app draw into
 * the frame; `allow-popups` lets a link in the document open in a new tab, outside the sandbox.
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
    <iframe
      #frame
      class="document-frame"
      [class.document-frame--hidden]="rendering()"
      title="Document preview"
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
    ></iframe>
  `,
  styleUrl: './attachment-document-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttachmentDocumentViewComponent {
  private readonly layout = inject(LayoutService);

  readonly blob = input.required<Blob>();
  readonly failed = output<string>();

  readonly rendering = signal(true);
  private readonly frame = viewChild.required<ElementRef<HTMLIFrameElement>>('frame');

  constructor() {
    effect(() => {
      const blob = this.blob();
      const frame = this.frame().nativeElement;
      untracked(() => {
        this.rendering.set(true);
        renderDocument(blob, frame, this.layout.isPhone())
          .then(() => this.rendering.set(false))
          .catch(() =>
            this.failed.emit('This document could not be shown. Download it to open it in Word.'),
          );
      });
    });
  }
}
