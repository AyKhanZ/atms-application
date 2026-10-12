import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AuthSessionService } from '../../../core/services/auth-session.service';
import { SnackBarService } from '../../../core/services/snack-bar.service';
import { translocoTestingProviders } from '../../../core/testing/transloco-testing';
import { EmailConfirmationComponent } from './email-confirmation';

describe('EmailConfirmationComponent', () => {
  const render = (signedIn: boolean) => {
    TestBed.configureTestingModule({
      imports: [EmailConfirmationComponent],
      providers: [
        ...translocoTestingProviders(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({ status: 'success' }) } },
        },
        { provide: AuthSessionService, useValue: { isAuthenticated: signal(signedIn) } },
        { provide: AuthService, useValue: {} },
        { provide: SnackBarService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(EmailConfirmationComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('offers login after the email is confirmed', () => {
    const page = render(false);

    const link = page.querySelector('.confirmed-actions a');
    expect(page.textContent).toContain('Email confirmed');
    expect(link?.getAttribute('href')).toBe('/login');
  });

  // another account signed in here: login would only bounce back to the dashboard
  it('offers the app instead of login when someone is already signed in', () => {
    const page = render(true);

    const link = page.querySelector('.confirmed-actions a');
    expect(page.textContent).toContain('Email confirmed');
    expect(link?.getAttribute('href')).toBe('/dashboard');
    expect(link?.textContent?.trim()).toBe('Go to the app');
  });
});
