import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  WorkItemPriorityComponent,
  priorityLevel,
  workItemPriorityTone,
} from './work-item-priority.component';

describe('WorkItemPriorityComponent', () => {
  let fixture: ComponentFixture<WorkItemPriorityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkItemPriorityComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(WorkItemPriorityComponent);
  });

  function render(code: string, name = code) {
    fixture.componentRef.setInput('priority', { id: 1, code, name });
    fixture.detectChanges();

    return fixture.nativeElement as HTMLElement;
  }

  it('renders the name next to a level meter', () => {
    const host = render('Medium');

    expect(host.querySelector('.work-item-priority__label')?.textContent).toContain('Medium');
    expect(host.querySelectorAll('.work-item-priority__bar')).toHaveLength(3);
  });

  it.each([
    ['Low', 1],
    ['Medium', 2],
    ['High', 3],
    ['Critical', 3],
  ] as const)('fills %s up to %i bars', (code, filled) => {
    const host = render(code);

    expect(host.querySelectorAll('.work-item-priority__bar.is-filled')).toHaveLength(filled);
  });

  it('announces the level for screen readers', () => {
    const host = render('Medium');

    expect(host.querySelector('.work-item-priority')?.getAttribute('aria-label')).toBe(
      'Priority: Medium, 2 of 3',
    );
  });

  it.each([
    ['Low', 'low'],
    ['Medium', 'medium'],
    ['High', 'high'],
    ['Critical', 'critical'],
    ['Urgent', 'critical'],
    ['Unknown', 'low'],
  ] as const)('maps %s to the %s tone', (code, tone) => {
    expect(workItemPriorityTone(code)).toBe(tone);
  });

  it('keeps critical at the top of the meter', () => {
    expect(priorityLevel('critical')).toBe(priorityLevel('high'));
  });
});
