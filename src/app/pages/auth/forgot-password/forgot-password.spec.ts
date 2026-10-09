import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { SnackBarService } from '../../../core/services/snack-bar.service';
import { ForgotPasswordComponent } from './forgot-password';

import { translocoTestingProviders } from '../../../core/testing/transloco-testing';
describe('ForgotPasswordComponent', () => {
  let auth: { forgotPassword: ReturnType<typeof vi.fn> };
  let snackBar: { error: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    auth = { forgotPassword: vi.fn(() => of(undefined)) };
    snackBar = { error: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [ForgotPasswordComponent],
      providers: [...translocoTestingProviders(), 
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: SnackBarService, useValue: snackBar },
      ],
    }).compileComponents();
  });

  // The page used to claim "sent" without calling the server.
  it('calls the API and shows the same answer whether or not the address exists', () => {
    const fixture = TestBed.createComponent(ForgotPasswordComponent);
    fixture.componentInstance.form.controls.email.setValue('leyla@example.com');

    fixture.componentInstance.onSubmit();
    fixture.detectChanges();

    expect(auth.forgotPassword).toHaveBeenCalledWith({ email: 'leyla@example.com' });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'If this email is registered, we sent a reset link to it.',
    );
  });

  it('does not call the API with an invalid address', () => {
    const fixture = TestBed.createComponent(ForgotPasswordComponent);
    fixture.componentInstance.form.controls.email.setValue('not-an-email');

    fixture.componentInstance.onSubmit();

    expect(auth.forgotPassword).not.toHaveBeenCalled();
  });

  it('reports a failed request', () => {
    auth.forgotPassword.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    const fixture = TestBed.createComponent(ForgotPasswordComponent);
    fixture.componentInstance.form.controls.email.setValue('leyla@example.com');

    fixture.componentInstance.onSubmit();

    expect(snackBar.error).toHaveBeenCalledWith('Could not send a reset link. Try again.');
    expect(fixture.componentInstance.sent()).toBe(false);
  });
});
