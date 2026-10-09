import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { currentLanguage } from '../../../../../core/i18n/active-language';

export interface RefusedAttachment {
  id: string;
  fileName: string;
  reason: string;
}

interface RefusedGroup {
  reason: string;
  fileNames: string[];
}

// a banner, not rows: a refused file drawn like a stored one reads as "attached"
// same reason = one line, ten .md files are one problem
@Component({
  selector: 'app-attachment-refused',
  imports: [TranslocoDirective],
  templateUrl: './attachment-refused.component.html',
  styleUrl: './attachment-refused.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttachmentRefusedComponent {
  readonly items = input.required<RefusedAttachment[]>();
  readonly dismiss = output<void>();

  private readonly transloco = inject(TranslocoService);

  readonly title = computed(() => {
    currentLanguage();
    return this.transloco.translate('attachments.refused', { count: this.items().length });
  });

  readonly groups = computed<RefusedGroup[]>(() => {
    const byReason = new Map<string, string[]>();
    for (const item of this.items()) {
      byReason.set(item.reason, [...(byReason.get(item.reason) ?? []), item.fileName]);
    }
    return [...byReason].map(([reason, fileNames]) => ({ reason, fileNames }));
  });
}
