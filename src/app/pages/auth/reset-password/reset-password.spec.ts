import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { SnackBarService } from '../../../core/services/snack-bar.service';
import { ResetPasswordComponent } from './reset-password';

import { translocoTestingProviders } from '../../../core/testing/transloco-testing';
describe('ResetPasswordComponent', () => {
  let auth: { resetPassword: ReturnType<typeof vi.fn> };
  let snackBar: { error: ReturnType<typeof vi.fn> };

  const create = (token: string | null) => {
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: { snapshot: { queryParamMap: convertToParamMap(token ? { token } : {}) } },
    });
    const fixture = TestBed.createComponent(ResetPasswordComponent);
    fixture.detectChanges();
    return fixture;
  };

  beforeEach(async () => {
    auth = { resetPassword: vi.fn(() => of(undefined)) };
    snackBar = { error: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [ResetPasswordComponent],
      providers: [...translocoTestingProviders(), 
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: SnackBarService, useValue: snackBar },
      ],
    }).compileComponents();
  });

  it('sends the token from the link with the new password and opens login', () => {
    const fixture = create('abc');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.componentInstance.form.setValue({
      password: 'NewPassword1!',
      confirmPassword: 'NewPassword1!',
    });

    fixture.componentInstance.onSubmit();

    expect(auth.resetPassword).toHaveBeenCalledWith({
      password: 'NewPassword1!',
      confirmPassword: 'NewPassword1!',
      token: 'abc',
    });
    expect(navigate).toHaveBeenCalledWith(['/login'], { state: { passwordChanged: true } });
  });

  it('explains a missing token instead of showing the form', () => {
    const fixture = create(null);

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'This password reset link is missing, invalid or expired.',
    );
  });

  it('switches to the expired-link message when the server rejects the token', () => {
    auth.resetPassword.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    const fixture = create('expired');
    fixture.componentInstance.form.setValue({
      password: 'NewPassword1!',
      confirmPassword: 'NewPassword1!',
    });

    fixture.componentInstance.onSubmit();

    expect(fixture.componentInstance.invalidToken()).toBe(true);
    expect(snackBar.error).not.toHaveBeenCalled();
  });

  it('does not call the server with a weak password', () => {
    const fixture = create('abc');
    fixture.componentInstance.form.setValue({ password: 'short', confirmPassword: 'short' });

    fixture.componentInstance.onSubmit();

    expect(auth.resetPassword).not.toHaveBeenCalled();
  });
});
