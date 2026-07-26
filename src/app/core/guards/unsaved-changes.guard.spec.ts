import { unsavedChangesGuard } from './unsaved-changes.guard';

describe('unsavedChangesGuard', () => {
  it('allows navigation when there are no unsaved changes', () => {
    const confirm = vi.spyOn(window, 'confirm');

    const result = unsavedChangesGuard(
      { hasUnsavedChanges: () => false },
      {} as never,
      {} as never,
      {} as never,
    );

    expect(result).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('asks before leaving and returns the user choice', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);

    const result = unsavedChangesGuard(
      { hasUnsavedChanges: () => true },
      {} as never,
      {} as never,
      {} as never,
    );

    expect(result).toBe(false);
    expect(confirm).toHaveBeenCalledOnce();
  });
});
