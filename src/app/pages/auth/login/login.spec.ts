import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';
import { Features } from '../../../store/features.enum';
import { initialAuthState } from '../../../store/auth/auth.state';
import { LoginComponent } from './login';

describe('LoginComponent notice', () => {
  const render = (state: unknown) => {
    history.replaceState(state, '');
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement)
      .querySelector('.auth-notice')
      ?.textContent?.trim();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        provideMockStore({ initialState: { [Features.Auth]: initialAuthState } }),
      ],
    }).compileComponents();
  });

  afterEach(() => history.replaceState(null, ''));

  it('tells where the reset link went after "forgot password" in Settings', () => {
    expect(render({ resetSentTo: 'leyla@example.com' })).toBe(
      'Check leyla@example.com for a password reset link.',
    );
  });

  it('confirms a successful password reset', () => {
    expect(render({ passwordChanged: true })).toBe(
      'Password changed. Sign in with the new password.',
    );
  });

  it('shows nothing on a plain visit', () => {
    expect(render(null)).toBeUndefined();
  });
});
