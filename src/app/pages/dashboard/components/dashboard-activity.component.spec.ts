import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HistoryAction } from '../../../core/enums/history-action.enum';
import { HistoryEntityType } from '../../../core/enums/history-entity-type.enum';
import { DashboardActivityModel } from '../../../core/models/dashboard';
import { DashboardActivityComponent } from './dashboard-activity.component';

import { translocoTestingProviders } from '../../../core/testing/transloco-testing';
const deletedTask: DashboardActivityModel = {
  ref: { projectId: 'project-1', workTicketId: 'ticket-1', workTaskId: 'task-1' },
  subject: { type: 'task', code: '41', title: 'Payment form', isDeleted: true },
  entry: {
    id: 'entry-1',
    entityType: HistoryEntityType.WorkTask,
    action: HistoryAction.Deleted,
    createdAt: '2026-09-25T10:00:00Z',
    changes: [],
  },
};

describe('DashboardActivityComponent', () => {
  function render(activities: DashboardActivityModel[]): HTMLElement {
    TestBed.configureTestingModule({
      providers: [...translocoTestingProviders(), provideRouter([])],
      imports: [DashboardActivityComponent],
    });
    const fixture = TestBed.createComponent(DashboardActivityComponent);
    fixture.componentRef.setInput('activities', activities);
    fixture.detectChanges();
    return fixture.nativeElement;
  }

  it('shows deleted work but does not link to it', () => {
    const row = render([deletedTask]).querySelector('.dashboard-activity') as HTMLAnchorElement;

    expect(row.textContent).toContain('41');
    expect(row.textContent).toContain('Payment form');
    expect(row.querySelector('app-work-item-ref')).not.toBeNull();
    expect(row.hasAttribute('href')).toBe(false);
  });

  it('links live work, so it opens in a new tab too', () => {
    const live = {
      ...deletedTask,
      subject: { ...deletedTask.subject, isDeleted: false },
      entry: { ...deletedTask.entry, action: HistoryAction.Updated },
    };
    const row = render([live]).querySelector('.dashboard-activity') as HTMLAnchorElement;

    expect(row.getAttribute('href')).toBe('/projects/project-1/tickets/ticket-1/tasks/task-1');
  });
});
