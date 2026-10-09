import { TestBed } from '@angular/core/testing';
import { translocoTestingProviders } from '../../../../core/testing/transloco-testing';
import { FormArray, FormControl, FormGroup } from '@angular/forms';
import {
  InvitationGroup,
  OnboardingInvitationsComponent,
} from './onboarding-invitations.component';

const invitation = (name = ''): InvitationGroup =>
  new FormGroup({
    name: new FormControl(name, { nonNullable: true }),
    surname: new FormControl('', { nonNullable: true }),
    email: new FormControl('', { nonNullable: true }),
  });

describe('OnboardingInvitationsComponent', () => {
  const render = async (rows: FormArray<InvitationGroup>, max = 6) => {
    await TestBed.configureTestingModule({
      imports: [OnboardingInvitationsComponent],
      providers: [...translocoTestingProviders()],
    }).compileComponents();
    const fixture = TestBed.createComponent(OnboardingInvitationsComponent);
    fixture.componentRef.setInput('rows', rows);
    fixture.componentRef.setInput('max', max);
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  };

  const names = (element: HTMLElement) =>
    [...element.querySelectorAll<HTMLInputElement>('input[formControlName="name"]')].map(
      (input) => input.value,
    );

  it('shows the rows the parent rebuilt in the same form array', async () => {
    const rows = new FormArray([invitation('Old')]);
    const { fixture, element } = await render(rows);

    rows.clear();
    rows.push(invitation('Anar'));
    rows.push(invitation('Leyla'));
    fixture.detectChanges();

    expect(names(element)).toEqual(['Anar', 'Leyla']);
    expect(element.textContent).toContain('2/6 added');
  });

  it('blocks adding at the limit', async () => {
    const { element } = await render(new FormArray([invitation(), invitation()]), 2);

    const add = [...element.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Add another user'),
    );
    expect(add?.disabled).toBe(true);
    expect(element.textContent).toContain('You can invite up to 2 users at a time.');
  });

  it('asks the parent to remove a row', async () => {
    const { fixture, element } = await render(new FormArray([invitation(), invitation()]));
    const removed: number[] = [];
    fixture.componentInstance.remove.subscribe((index) => removed.push(index));

    element.querySelectorAll<HTMLButtonElement>('.remove-row--desktop')[1].click();

    expect(removed).toEqual([1]);
  });

  it('has no remove button for the only row', async () => {
    const { element } = await render(new FormArray([invitation()]));

    expect(element.querySelector('.remove-row')).toBeNull();
  });
});
