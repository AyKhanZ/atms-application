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
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { LayoutService } from '../../../../../core/services/layout.service';
import { renderDocument } from '../../attachment-content';

// no allow-scripts so nothing in the document runs as the user
// allow-same-origin only to draw into it, allow-popups so links open in a new tab
@Component({
  selector: 'app-attachment-document-view',
  imports: [TranslocoDirective],
  template: `
    <ng-container *transloco="let t">
    @if (rendering()) {
      <div class="document-state" role="status">
        <i class="pi pi-spin pi-spinner" aria-hidden="true"></i>
        <span>{{ t('attachments.openingDocument') }}</span>
      </div>
    }
    <iframe
      #frame
      class="document-frame"
      [class.document-frame--hidden]="rendering()"
      [title]="t('attachments.documentTitle')"
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
    ></iframe>
    </ng-container>
  `,
  styleUrl: './attachment-document-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttachmentDocumentViewComponent {
  private readonly layout = inject(LayoutService);
  private readonly transloco = inject(TranslocoService);

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
            this.failed.emit(this.transloco.translate('attachments.documentFailed')),
          );
      });
    });
  }
}
