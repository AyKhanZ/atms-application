import { ConfirmEventType, ConfirmationService } from 'primeng/api';
import { TranslocoService } from '@jsverse/transloco';
import { ChoiceConfirmation, confirmTone } from './confirm-dialog.component';

export type CloseOpenWorkChoice = 'all' | 'only' | 'cancel';

export interface CloseOpenWorkQuestion {
  key: string;
  // already translated and uppercased, e.g. "ЗАДАЧА #34"
  itemRef: string;
  title: string;
  openCount: number;
  child: 'task' | 'subtask';
}

// asked, not refused and not done silently: refusing made people close children one by one
// Mark all as done is default, Only this keeps the freedom, Cancel changes nothing
export function askToCloseOpenWork(
  confirmation: ConfirmationService,
  transloco: TranslocoService,
  question: CloseOpenWorkQuestion,
): Promise<CloseOpenWorkChoice> {
  const header = transloco.translate(
    question.child === 'subtask' ? 'tasks.closeOpen' : 'tickets.closeOpen',
    { count: question.openCount },
  );

  return new Promise((resolve) => {
    const choice: ChoiceConfirmation = {
      key: question.key,
      header,
      message: `${question.itemRef} ${question.title}\n${transloco.translate('tickets.closeQuestion')}`,
      acceptLabel: transloco.translate('tickets.markAllDone'),
      rejectLabel: transloco.translate('tickets.onlyThis'),
      cancelLabel: transloco.translate('common.cancel'),
      acceptButtonProps: confirmTone('warning'),
      accept: () => resolve('all'),
      reject: (type?: ConfirmEventType) =>
        resolve(type === ConfirmEventType.REJECT ? 'only' : 'cancel'),
    };
    confirmation.confirm(choice);
  });
}

export function workItemRef(transloco: TranslocoService, kindKey: string, code: number | string): string {
  const kind = transloco.translate(kindKey).toLocaleUpperCase(transloco.getActiveLang());
  return `${kind} #${code}`;
}
