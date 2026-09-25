import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { Subject } from 'rxjs';
import { AuthStoreActions } from '../../../store/auth';
import { HistorySectionsService } from './history-sections.service';

describe('HistorySectionsService', () => {
  let actions: Subject<Action>;
  let sections: HistorySectionsService;

  beforeEach(() => {
    actions = new Subject<Action>();
    TestBed.configureTestingModule({ providers: [provideMockActions(() => actions)] });
    sections = TestBed.inject(HistorySectionsService);
  });

  it('keeps a folded part folded for the next History tab', () => {
    sections.toggleStates();

    expect(sections.statesOpen()).toBe(false);
    expect(sections.entriesOpen()).toBe(true);
  });

  it('opens everything again for the next person to sign in', () => {
    sections.toggleStates();
    sections.toggleEntries();

    actions.next(AuthStoreActions.logoutCompleted());

    expect(sections.statesOpen()).toBe(true);
    expect(sections.entriesOpen()).toBe(true);
  });
});
