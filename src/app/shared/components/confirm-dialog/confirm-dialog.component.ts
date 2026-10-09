import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { Confirmation } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

// reject gets REJECT for the second answer and CANCEL for cancel, close button and escape
export interface ChoiceConfirmation extends Confirmation {
  cancelLabel: string;
}

// danger = destroys data
export type ConfirmTone = 'warning' | 'danger';

export function confirmTone(tone: ConfirmTone): { severity: 'danger' | 'primary' } {
  return { severity: tone === 'danger' ? 'danger' : 'primary' };
}

// primeng p-confirmDialog in headless mode so focus trap, escape and ConfirmationService stay as is, only the inside is ours
@Component({
  selector: 'app-confirm-dialog',
  imports: [ButtonModule, ConfirmDialogModule],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialogComponent {
  private readonly transloco = inject(TranslocoService);
  readonly key = input.required<string>();

  tone(confirmation: Confirmation): ConfirmTone {
    if (this.isNotice(confirmation)) return 'warning';

    return confirmation.acceptButtonProps?.severity === 'danger' ? 'danger' : 'warning';
  }

  // question (cancel + action) or notice (one button); decided by whether a reject button exists
  // a notice is never red
  isNotice(confirmation: Confirmation): boolean {
    return confirmation.rejectVisible === false;
  }

  // first line is the subject, the rest is what it means, so a long title gets its own line
  subject(confirmation: Confirmation): string {
    const [first, ...rest] = (confirmation.message ?? '').split('\n');

    return rest.length > 0 ? first.trim() : '';
  }

  detail(confirmation: Confirmation): string {
    const [first, ...rest] = (confirmation.message ?? '').split('\n');

    return (rest.length > 0 ? rest.join(' ') : first).trim();
  }

  // only on ChoiceConfirmation
  cancelLabel(confirmation: Confirmation): string | null {
    const label = (confirmation as Partial<ChoiceConfirmation>).cancelLabel;
    return typeof label === 'string' && label.length > 0 ? label : null;
  }

  acceptLabel(confirmation: Confirmation): string {
    if (confirmation.acceptLabel) return confirmation.acceptLabel;
    return this.transloco.translate(this.isNotice(confirmation) ? 'common.gotIt' : 'common.ok');
  }

  rejectLabel(confirmation: Confirmation): string {
    return confirmation.rejectLabel || this.transloco.translate('common.cancel');
  }
}
