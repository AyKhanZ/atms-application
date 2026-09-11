import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Confirmation } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

/** How loud the dialog is. `danger` is for something that destroys data. */
export type ConfirmTone = 'warning' | 'danger';

/**
 * Tone of a confirmation, passed as `acceptButtonProps: confirmTone('danger')`: the accept button
 * says how serious the action is, and the dialog takes its colour from the same place.
 */
export function confirmTone(tone: ConfirmTone): { severity: 'danger' | 'primary' } {
  return { severity: tone === 'danger' ? 'danger' : 'primary' };
}

/**
 * The project's confirm dialog: a tinted status icon, the question, what happens, then the
 * buttons.
 *
 * It is PrimeNG's `p-confirmDialog` in headless mode rather than a dialog of our own, so the
 * focus trap, Escape handling and the ConfirmationService API stay exactly as they are — only
 * the inside is ours. The default rendering put the icon beside the text and stretched the panel
 * to the width of the screen, which read as a page, not as a warning.
 */
@Component({
  selector: 'app-confirm-dialog',
  imports: [ButtonModule, ConfirmDialogModule],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialogComponent {
  /** Matches the `key` the caller passes to `ConfirmationService.confirm()`. */
  readonly key = input.required<string>();

  tone(confirmation: Confirmation): ConfirmTone {
    if (this.isNotice(confirmation)) return 'warning';

    return confirmation.acceptButtonProps?.severity === 'danger' ? 'danger' : 'warning';
  }

  /**
   * Two different things share this dialog:
   *
   * - a **question** the user answers — "Delete ticket?" — Cancel plus the action;
   * - a **notice** that states why something cannot happen — "This ticket can't be deleted yet"
   *   — nothing to decide, one button to dismiss.
   *
   * The caller already says which it is by whether a reject button exists, so there is no extra
   * flag to keep in sync. A notice is never red: nothing destructive is about to happen.
   */
  isNotice(confirmation: Confirmation): boolean {
    return confirmation.rejectVisible === false;
  }

  /**
   * The message is written as "what it is about" on the first line and "what that means" on the
   * rest. Splitting them lets the dialog give the subject its own line instead of burying a long
   * ticket title in quotes inside a sentence, which is what made these dialogs unreadable.
   */
  subject(confirmation: Confirmation): string {
    const [first, ...rest] = (confirmation.message ?? '').split('\n');

    return rest.length > 0 ? first.trim() : '';
  }

  detail(confirmation: Confirmation): string {
    const [first, ...rest] = (confirmation.message ?? '').split('\n');

    return (rest.length > 0 ? rest.join(' ') : first).trim();
  }

  acceptLabel(confirmation: Confirmation): string {
    return confirmation.acceptLabel || (this.isNotice(confirmation) ? 'Got it' : 'OK');
  }
}
