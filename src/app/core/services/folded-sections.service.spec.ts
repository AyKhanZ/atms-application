import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { Subject } from 'rxjs';
import { AuthStoreActions } from '../../store/auth';
import { FoldedSectionsService } from './folded-sections.service';

describe('FoldedSectionsService', () => {
  let actions: Subject<Action>;
  let sections: FoldedSectionsService;

  beforeEach(() => {
    actions = new Subject<Action>();
    TestBed.configureTestingModule({ providers: [provideMockActions(() => actions)] });
    sections = TestBed.inject(FoldedSectionsService);
  });

  it('keeps a folded part folded for the next page that shows it', () => {
    sections.open('history.states').set(false);

    expect(sections.open('history.states')()).toBe(false);
    expect(sections.open('history.entries')()).toBe(true);
  });

  it('opens everything again for the next person to sign in', () => {
    sections.open('task.description').set(false);
    sections.open('task.discussion').set(false);

    actions.next(AuthStoreActions.logoutCompleted());

    expect(sections.open('task.description')()).toBe(true);
    expect(sections.open('task.discussion')()).toBe(true);
  });
});
