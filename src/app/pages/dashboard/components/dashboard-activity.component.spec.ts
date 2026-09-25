import { TestBed } from '@angular/core/testing';
import { HistoryAction } from '../../../core/enums/history-action.enum';
import { HistoryEntityType } from '../../../core/enums/history-entity-type.enum';
import { DashboardActivityModel } from '../../../core/models/dashboard';
import { DashboardActivityComponent } from './dashboard-activity.component';

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
  it('shows deleted work but does not navigate to it', () => {
    TestBed.configureTestingModule({ imports: [DashboardActivityComponent] });
    const fixture = TestBed.createComponent(DashboardActivityComponent);
    const selected = vi.fn();
    fixture.componentInstance.selected.subscribe(selected);
    fixture.componentRef.setInput('activities', [deletedTask]);
    fixture.detectChanges();

    const row = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(row.textContent).toContain('41');
    expect(row.textContent).toContain('Payment form');
    expect(row.querySelector('app-work-item-ref')).not.toBeNull();
    expect(row.disabled).toBe(true);
    row.click();
    expect(selected).not.toHaveBeenCalled();
  });
});
