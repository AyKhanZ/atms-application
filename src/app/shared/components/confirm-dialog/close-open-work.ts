import { ConfirmEventType, ConfirmationService } from 'primeng/api';
import { ChoiceConfirmation, confirmTone } from './confirm-dialog.component';

export type CloseOpenWorkChoice = 'all' | 'only' | 'cancel';

export interface CloseOpenWorkQuestion {
  key: string;
  // "TASK #34"
  itemRef: string;
  title: string;
  openCount: number;
  // "subtask" or "task"
  childLabel: string;
}

// asked, not refused and not done silently: refusing made people close children one by one
// Mark all as done is default, Only this keeps the freedom, Cancel changes nothing
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
