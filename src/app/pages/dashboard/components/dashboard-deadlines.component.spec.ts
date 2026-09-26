import { TestBed } from '@angular/core/testing';
import { DashboardDeadlineModel } from '../../../core/models/dashboard';
import { DashboardDeadlinesComponent } from './dashboard-deadlines.component';

const deadline: DashboardDeadlineModel = {
  ref: { projectId: 'project-1', workTicketId: 'ticket-1', workTaskId: 'task-1' },
  code: '41',
  title: 'Payment form',
  isSubtask: false,
  deadline: '2026-09-28T00:00:00Z',
  priority: { id: 2, name: 'High' },
  assignee: null,
};

describe('DashboardDeadlinesComponent', () => {
  function create(total: number) {
    TestBed.configureTestingModule({ imports: [DashboardDeadlinesComponent] });
    const fixture = TestBed.createComponent(DashboardDeadlinesComponent);
    fixture.componentRef.setInput('deadlines', [deadline]);
    fixture.componentRef.setInput('total', total);
    fixture.detectChanges();
    return fixture;
  }

  it('says how many are hidden and opens the calendar for all of them', () => {
    const fixture = create(14);
    const showAll = vi.fn();
    fixture.componentInstance.showAll.subscribe(showAll);

    const footer = fixture.nativeElement.querySelector('.dashboard-deadlines__more') as HTMLElement;
    expect(footer.textContent).toContain('The nearest 1 of 14');
    (footer.querySelector('button') as HTMLButtonElement).click();
    expect(showAll).toHaveBeenCalledOnce();
  });

  it('has no footer when every deadline is listed', () => {
    const fixture = create(1);

    expect(fixture.nativeElement.querySelector('.dashboard-deadlines__more')).toBeNull();
  });
});
