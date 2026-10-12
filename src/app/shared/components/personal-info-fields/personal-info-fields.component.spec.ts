import { TestBed } from '@angular/core/testing';
import { createPersonalInfoForm, PersonalInfoForm } from './personal-info.form';
import { PersonalInfoFieldsComponent } from './personal-info-fields.component';

import { translocoTestingProviders } from '../../../core/testing/transloco-testing';
describe('PersonalInfoFieldsComponent phone', () => {
  let form: PersonalInfoForm;

  const render = async (
    phone: string,
    serverError?: string,
    languageChangesAfterContinue = false,
  ) => {
    await TestBed.configureTestingModule({
      providers: [...translocoTestingProviders()],
      imports: [PersonalInfoFieldsComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(PersonalInfoFieldsComponent);
    form = createPersonalInfoForm();
    form.controls.phoneNumber.setValue(phone);
    form.controls.phoneNumber.markAsTouched();
    fixture.componentRef.setInput('form', form);
    fixture.componentRef.setInput('languages', []);
    fixture.componentRef.setInput('genders', []);
    fixture.componentRef.setInput('maritalStatuses', []);
    fixture.componentRef.setInput('languageChangesAfterContinue', languageChangesAfterContinue);
    fixture.detectChanges();
    // The input writes its value back on the first render and would wipe a server error set before it.
    if (serverError) {
      form.controls.phoneNumber.setErrors({ server: serverError });
      fixture.detectChanges();
    }
    return fixture.nativeElement as HTMLElement;
  };

  const type = (element: HTMLElement, value: string, caret = value.length) => {
    const input = element.querySelector<HTMLInputElement>('#phone')!;
    input.value = value;
    input.setSelectionRange(caret, caret);
    input.dispatchEvent(new Event('input'));
    return input;
  };

  const paste = (element: HTMLElement, text: string) => {
    const input = element.querySelector<HTMLInputElement>('#phone')!;
    const event = new Event('paste', { cancelable: true }) as ClipboardEvent;
    Object.defineProperty(event, 'clipboardData', { value: { getData: () => text } });
    input.dispatchEvent(event);
    return input;
  };

  it('says how many digits are missing', async () => {
    const element = await render('50 123 45');

    expect(element.textContent).toContain('Enter 9 digits after +994.');
  });

  it('shows +994 next to the digits and counts only the digits', async () => {
    const element = await render('50 353 78 88');

    expect(element.querySelector('.phone-prefix')?.textContent).toBe('+994');
    expect(element.textContent).toContain('9/9');
  });

  it('groups digits as they are typed and keeps the caret after the typed one', async () => {
    const element = await render('');
    const input = type(element, '503');

    expect(input.value).toBe('50 3');
    expect(input.selectionStart).toBe(4);
    expect(form.controls.phoneNumber.value).toBe('50 3');
  });

  it('keeps the form value equal to what the field shows', async () => {
    const element = await render('');
    type(element, '0503537888');

    expect(form.controls.phoneNumber.value).toBe('50 353 78 88');
    expect(form.controls.phoneNumber.valid).toBe(true);
    expect(form.controls.phoneNumber.dirty).toBe(true);
  });

  it('takes no tenth digit into a full field', async () => {
    const element = await render('50 353 78 88');
    const input = element.querySelector<HTMLInputElement>('#phone')!;
    input.setSelectionRange(12, 12);
    const event = new InputEvent('beforeinput', {
      inputType: 'insertText',
      data: '1',
      cancelable: true,
    });
    input.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it('lets backspace after a space remove the digit before it', async () => {
    const element = await render('50 353');
    const input = element.querySelector<HTMLInputElement>('#phone')!;
    input.setSelectionRange(3, 3);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));

    expect(input.selectionStart).toBe(2);
  });

  it('drops the 0 people type out of habit', async () => {
    const element = await render('');

    expect(type(element, '0503537888').value).toBe('50 353 78 88');
  });

  it('drops +994 typed again in front of the number', async () => {
    const element = await render('');

    expect(type(element, '99 450 35 378').value).toBe('50 353 78');
  });

  it.each(['+994 50 353 78 88', '00994503537888', '(050) 353-78-88'])(
    'replaces the field with a pasted full number (%s)',
    async (text) => {
      const element = await render('70 1');

      expect(paste(element, text).value).toBe('50 353 78 88');
      expect(form.controls.phoneNumber.value).toBe('50 353 78 88');
    },
  );

  it('shows the server message under the field', async () => {
    const element = await render('11 111 11 11', 'Enter a valid international phone number.');

    expect(element.textContent).toContain('Enter a valid international phone number.');
    expect(element.textContent).not.toContain('digits after');
  });

  it('tells the user the language changes after Continue, under the language field', async () => {
    const element = await render('', undefined, true);
    const field = element.querySelector('#language')?.closest('.field');
    const hint = field?.querySelector('.language-apply-hint');
    const select = field?.querySelector('p-select');

    expect(hint?.textContent?.trim()).toBe(
      'The interface language changes after you press Continue.',
    );
    expect(select?.nextElementSibling).toBe(hint?.parentElement);
  });
});
