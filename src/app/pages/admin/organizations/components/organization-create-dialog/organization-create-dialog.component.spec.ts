import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { provideMockStore } from '@ngrx/store/testing';
import { Subject } from 'rxjs';
import { translocoTestingProviders } from '../../../../../core/testing/transloco-testing';
import { OrganizationsStoreActions } from '../../../../../store/organizations';
import { OrganizationCreateDialogComponent } from './organization-create-dialog.component';

describe('OrganizationCreateDialogComponent', () => {
  let actions: Subject<Action>;

  const voenTaken = OrganizationsStoreActions.createOrganizationFailure({
    error: { status: 400, message: 'This tax ID is already used by another organization.' },
    field: 'Voen',
  });

  const render = () => {
    const fixture = TestBed.createComponent(OrganizationCreateDialogComponent);
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
    return fixture.componentInstance;
  };

  beforeEach(() => {
    actions = new Subject<Action>();
    TestBed.configureTestingModule({
      imports: [OrganizationCreateDialogComponent],
      providers: [
        ...translocoTestingProviders(),
        provideMockActions(() => actions),
        provideMockStore({ initialState: { organizations: { isSubmitted: false } } }),
      ],
    });
  });

  it('puts a refusal under the field the server named', () => {
    const dialog = render();

    actions.next(voenTaken);

    expect(dialog.errorMessage('voen')).toBe('This tax ID is already used by another organization.');
    expect(dialog.errorMessage('title')).toBe('');
  });

  it('clears the refusal once that field is edited', () => {
    const dialog = render();
    actions.next(voenTaken);

    dialog.form.controls.voen.setValue('1902233442');

    expect(dialog.errorMessage('voen')).toBe('');
  });

  it('keeps the refusal while another field is edited', () => {
    const dialog = render();
    actions.next(voenTaken);

    dialog.form.controls.title.setValue('Yelo Bank 2');

    expect(dialog.errorMessage('voen')).toBe('This tax ID is already used by another organization.');
  });
});
