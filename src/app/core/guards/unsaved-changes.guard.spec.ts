import { TestBed } from '@angular/core/testing';
import { AuthSessionService } from '../services/auth-session.service';
import { HasUnsavedChanges, unsavedChangesGuard } from './unsaved-changes.guard';

import { translocoTestingProviders } from '../testing/transloco-testing';
describe('unsavedChangesGuard', () => {
  let authenticated: boolean;

  const runGuard = (component: HasUnsavedChanges) =>
    TestBed.runInInjectionContext(() =>
      unsavedChangesGuard(component, {} as never, {} as never, {} as never),
    );

  beforeEach(() => {
    authenticated = true;
    TestBed.configureTestingModule({
      providers: [...translocoTestingProviders(), 
        { provide: AuthSessionService, useValue: { isAuthenticated: () => authenticated } },
      ],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('allows navigation when there are no unsaved changes', () => {
    const confirm = vi.spyOn(window, 'confirm');

    const result = runGuard({ hasUnsavedChanges: () => false });

    expect(result).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('asks before leaving and returns the user choice', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);

    const result = runGuard({ hasUnsavedChanges: () => true });

    expect(result).toBe(false);
    expect(confirm).toHaveBeenCalledOnce();
  });

  it('uses component confirmation when provided', () => {
    const confirm = vi.spyOn(window, 'confirm');
    const componentConfirm = vi.fn().mockReturnValue(true);

    const result = runGuard({
      hasUnsavedChanges: () => true,
      confirmUnsavedChanges: componentConfirm,
    });

    expect(result).toBe(true);
    expect(componentConfirm).toHaveBeenCalledOnce();
    expect(confirm).not.toHaveBeenCalled();
  });

  it('does not fall back to the browser confirmation when component confirmation is rejected', async () => {
    const confirm = vi.spyOn(window, 'confirm');
    const componentConfirm = vi.fn().mockResolvedValue(false);

    const result = runGuard({
      hasUnsavedChanges: () => true,
      confirmUnsavedChanges: componentConfirm,
    });

    await expect(result).resolves.toBe(false);
    expect(componentConfirm).toHaveBeenCalledOnce();
    expect(confirm).not.toHaveBeenCalled();
  });

  // Logout from the menu, or "forgot password" in Settings, ends the session before navigating.
  it('lets the user go without asking once the session has ended', () => {
    authenticated = false;
    const confirm = vi.spyOn(window, 'confirm');
    const componentConfirm = vi.fn();

    const result = runGuard({
      hasUnsavedChanges: () => true,
      confirmUnsavedChanges: componentConfirm,
    });

    expect(result).toBe(true);
    expect(componentConfirm).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
  });
});
