import { TestBed } from '@angular/core/testing';
import { CanActivateFn, Router } from '@angular/router';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { AuthSessionService } from '../services/auth-session.service';
import { onboardingCompletedGuard, onboardingPageGuard } from './onboarding.guard';

interface AuthStub {
  ready$: BehaviorSubject<boolean>;
  isOnboardingCompleted: () => boolean;
}

async function runGuard(guard: CanActivateFn): Promise<unknown> {
  const result = TestBed.runInInjectionContext(() => guard({} as never, {} as never));
  return firstValueFrom(result as Observable<unknown>);
}

describe('onboarding guards', () => {
  let auth: AuthStub;
  let router: { createUrlTree: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    auth = {
      ready$: new BehaviorSubject(true),
      isOnboardingCompleted: vi.fn(),
    };
    router = { createUrlTree: vi.fn((commands: string[]) => commands.join('/')) };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthSessionService, useValue: auth },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('sends incomplete users to onboarding', async () => {
    vi.mocked(auth.isOnboardingCompleted).mockReturnValue(false);

    expect(await runGuard(onboardingCompletedGuard)).toBe('/onboarding');
    expect(router.createUrlTree).toHaveBeenCalledWith(['/onboarding']);
  });

  it('allows completed users into protected pages', async () => {
    vi.mocked(auth.isOnboardingCompleted).mockReturnValue(true);

    expect(await runGuard(onboardingCompletedGuard)).toBe(true);
  });

  it('keeps incomplete users on the onboarding page', async () => {
    vi.mocked(auth.isOnboardingCompleted).mockReturnValue(false);

    expect(await runGuard(onboardingPageGuard)).toBe(true);
  });

  it('sends completed users to the dashboard', async () => {
    vi.mocked(auth.isOnboardingCompleted).mockReturnValue(true);

    expect(await runGuard(onboardingPageGuard)).toBe('/dashboard');
    expect(router.createUrlTree).toHaveBeenCalledWith(['/dashboard']);
  });
});
