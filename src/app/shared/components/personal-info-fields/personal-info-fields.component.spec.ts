import { TestBed } from '@angular/core/testing';
import { createPersonalInfoForm } from './personal-info.form';
import { PersonalInfoFieldsComponent } from './personal-info-fields.component';

import { translocoTestingProviders } from '../../../core/testing/transloco-testing';
describe('PersonalInfoFieldsComponent phone', () => {
  const render = async (phone: string, serverError?: string) => {
    await TestBed.configureTestingModule({ providers: [...translocoTestingProviders()],
      imports: [PersonalInfoFieldsComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(PersonalInfoFieldsComponent);
    const form = createPersonalInfoForm();
    form.controls.phoneNumber.setValue(phone);
    form.controls.phoneNumber.markAsTouched();
    fixture.componentRef.setInput('form', form);
    fixture.componentRef.setInput('languages', []);
    fixture.componentRef.setInput('genders', []);
    fixture.componentRef.setInput('maritalStatuses', []);
    fixture.detectChanges();
    // The input writes its value back on the first render and would wipe a server error set before it.
    if (serverError) {
      form.controls.phoneNumber.setErrors({ server: serverError });
      fixture.detectChanges();
    }
    return fixture.nativeElement as HTMLElement;
  };

  it.each(['+994 50 123 45', '+994 50 123 45 001'])(
    'says how many digits an Azerbaijan number needs (%s)',
    async (phone) => {
      const element = await render(phone);

      expect(element.textContent).toContain('Enter 9 digits after +994.');
    },
  );

  it('shows the server message under the field', async () => {
    const element = await render('+994 00 000 00 00', 'Enter a valid international phone number.');

    expect(element.textContent).toContain('Enter a valid international phone number.');
    expect(element.textContent).not.toContain('digits after');
  });
});
