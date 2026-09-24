import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

export interface RefusedAttachment {
  id: string;
  fileName: string;
  reason: string;
}

interface RefusedGroup {
  reason: string;
  fileNames: string[];
}

/**
 * Files that were not added, and why. A banner rather than rows in the list: a refused file drawn
 * like a stored one, with a tile and a name, read as "attached, with a warning". Files refused
 * for the same reason share one line — ten `.md` files are one problem, not ten.
 */
@Component({
  selector: 'app-attachment-refused',
  templateUrl: './attachment-refused.component.html',
  styleUrl: './attachment-refused.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttachmentRefusedComponent {
  readonly items = input.required<RefusedAttachment[]>();
  readonly dismiss = output<void>();

  readonly title = computed(() => {
    const count = this.items().length;
    return count === 1 ? '1 file was not added' : `${count} files were not added`;
  });

  readonly groups = computed<RefusedGroup[]>(() => {
    const byReason = new Map<string, string[]>();
    for (const item of this.items()) {
      byReason.set(item.reason, [...(byReason.get(item.reason) ?? []), item.fileName]);
    }
    return [...byReason].map(([reason, fileNames]) => ({ reason, fileNames }));
  });
}
