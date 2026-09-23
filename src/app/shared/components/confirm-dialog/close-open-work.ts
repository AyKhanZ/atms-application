import { ConfirmEventType, ConfirmationService } from 'primeng/api';
import { ChoiceConfirmation, confirmTone } from './confirm-dialog.component';

/** What the user chose when closing something that still has open work under it. */
export type CloseOpenWorkChoice = 'all' | 'only' | 'cancel';

export interface CloseOpenWorkQuestion {
  /** The `app-confirm-dialog` on the page. */
  key: string;
  /** "TASK #34" — what is being closed, as it is named everywhere. */
  itemRef: string;
  title: string;
  /** How many under it are not done. */
  openCount: number;
  /** "subtask" or "task". */
  childLabel: string;
}

/**
 * Closing a task with open subtasks, or a ticket with open tasks: asked, not refused and not done
 * silently (05-tasks, «Статусы»). A refusal made people close children one by one; silence left an
 * item "done" while its work was not. Mark all as done is the default, Only this task keeps the
 * Azure-like freedom, Cancel changes nothing.
 */
export function askToCloseOpenWork(
  confirmation: ConfirmationService,
  question: CloseOpenWorkQuestion,
): Promise<CloseOpenWorkChoice> {
  const children = question.openCount === 1 ? question.childLabel : `${question.childLabel}s`;
  const verb = question.openCount === 1 ? 'is' : 'are';

  return new Promise((resolve) => {
    const choice: ChoiceConfirmation = {
      key: question.key,
      header: `${question.openCount} ${children} ${verb} not done`,
      message: `${question.itemRef} ${question.title}
Close them together with it, or only this one?`,
      acceptLabel: 'Mark all as done',
      rejectLabel: 'Only this one',
      cancelLabel: 'Cancel',
      acceptButtonProps: confirmTone('warning'),
      accept: () => resolve('all'),
      reject: (type?: ConfirmEventType) =>
        resolve(type === ConfirmEventType.REJECT ? 'only' : 'cancel'),
    };
    confirmation.confirm(choice);
  });
}
