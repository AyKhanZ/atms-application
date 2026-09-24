import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HistoryEntityType } from '../../../../../core/enums/history-entity-type.enum';
import { HistoryStateModel } from '../../../../../core/models/history';
import { HistoryStateBarComponent } from './history-state-bar.component';

describe('HistoryStateBarComponent', () => {
  const render = (
    states: HistoryStateModel[] | null,
    current = null as null | { id: number; code: string; name: string },
  ) => {
    TestBed.configureTestingModule({
      imports: [HistoryStateBarComponent],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(HistoryStateBarComponent);
    fixture.componentRef.setInput('states', states);
    fixture.componentRef.setInput('entityType', HistoryEntityType.WorkTask);
    fixture.componentRef.setInput('projectId', 'p');
    fixture.componentRef.setInput('current', current);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    return [...element.querySelectorAll('.state-step__label')].map((label) =>
      label.textContent?.trim(),
    );
  };

  const person = { id: 'u', name: 'Tatyana', surname: 'Raik' };

  it('names the creation and every move after it', () => {
    expect(
      render([
        {
          status: { id: '1', code: 'New', name: 'New' },
          changedAt: '2026-05-19T09:00:00Z',
          changedBy: person,
        },
        {
          status: { id: '2', code: 'InProgress', name: 'In Progress' },
          changedAt: '2026-09-24T09:00:00Z',
          changedBy: person,
        },
      ]),
    ).toEqual(['Created', 'Moved to In Progress']);
  });

  it('says Earlier only when the first status has no date', () => {
    expect(
      render([
        { status: { id: '1', code: 'New', name: 'New' } },
        {
          status: { id: '2', code: 'InProgress', name: 'In Progress' },
          changedAt: '2026-09-24T09:00:00Z',
        },
      ]),
    ).toEqual(['Earlier', 'Moved to In Progress']);
  });

  it('folds all but the newest three on a phone until asked', () => {
    TestBed.configureTestingModule({
      imports: [HistoryStateBarComponent],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(HistoryStateBarComponent);
    fixture.componentRef.setInput(
      'states',
      ['1', '2', '3', '1', '2'].map((id, index) => ({
        status: { id, code: id, name: `Status ${id}` },
        changedAt: `2026-09-2${index}T09:00:00Z`,
      })),
    );
    fixture.componentRef.setInput('entityType', HistoryEntityType.WorkTask);
    fixture.componentRef.setInput('projectId', 'p');
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('.state-step.is-early')).toHaveLength(2);
    const more = element.querySelector<HTMLButtonElement>('.state-more__button');
    expect(more?.textContent?.trim()).toBe('Show 2 earlier');

    more?.click();
    fixture.detectChanges();

    expect(element.querySelector('.state-more__button')).toBeNull();
    expect(element.querySelector('.state-track.is-expanded')).not.toBeNull();
  });

  it('shows the current status when no change was recorded', () => {
    expect(render([], { id: 1, code: 'New', name: 'New' })).toEqual(['Current']);
  });
});
