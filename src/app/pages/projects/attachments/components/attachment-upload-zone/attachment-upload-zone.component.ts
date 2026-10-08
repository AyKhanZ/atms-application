import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_HINT,
  ATTACHMENT_TYPES_TITLE,
} from '../../../../../core/utils/attachment.utils';

@Component({
  selector: 'app-attachment-upload-zone',
  imports: [ButtonModule],
  templateUrl: './attachment-upload-zone.component.html',
  styleUrl: './attachment-upload-zone.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttachmentUploadZoneComponent {
  readonly kind = input<'task' | 'subtask'>('task');
  readonly filesChosen = output<File[]>();

  protected readonly accept = ATTACHMENT_ACCEPT;
  protected readonly hint = ATTACHMENT_HINT;
  protected readonly typesTitle = ATTACHMENT_TYPES_TITLE;
  readonly dragging = signal(false);

  // dragenter/dragleave fire for every child, the depth tells the real ones
  private dragDepth = 0;

  dragEnter(event: DragEvent): void {
    if (!this.carriesFiles(event)) return;
    event.preventDefault();
    this.dragDepth++;
    this.dragging.set(true);
  }

  dragOver(event: DragEvent): void {
    if (!this.carriesFiles(event)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  }

  dragLeave(): void {
    this.dragDepth = Math.max(0, this.dragDepth - 1);
    if (this.dragDepth === 0) this.dragging.set(false);
  }

  drop(event: DragEvent): void {
    event.preventDefault();
    this.dragDepth = 0;
    this.dragging.set(false);
    const files = Array.from(event.dataTransfer?.files ?? []);
    if (files.length) this.filesChosen.emit(files);
  }

  picked(input: HTMLInputElement): void {
    const files = Array.from(input.files ?? []);
    // so picking the same file again still fires change
    input.value = '';
    if (files.length) this.filesChosen.emit(files);
  }

  private carriesFiles(event: DragEvent): boolean {
    return Array.from(event.dataTransfer?.types ?? []).includes('Files');
  }
}
