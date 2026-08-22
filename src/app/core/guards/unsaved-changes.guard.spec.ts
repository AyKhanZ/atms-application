import { unsavedChangesGuard } from './unsaved-changes.guard';

describe('unsavedChangesGuard', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it('uses component confirmation when provided', () => {
    const confirm = vi.spyOn(window, 'confirm');
    const componentConfirm = vi.fn().mockReturnValue(true);

    const result = unsavedChangesGuard(
      {
        hasUnsavedChanges: () => true,
        confirmUnsavedChanges: componentConfirm,
      },
      {} as never,
      {} as never,
      {} as never,
    );

    expect(result).toBe(true);
    expect(componentConfirm).toHaveBeenCalledOnce();
    expect(confirm).not.toHaveBeenCalled();
  });

  it('does not fall back to the browser confirmation when component confirmation is rejected', async () => {
    const confirm = vi.spyOn(window, 'confirm');
    const componentConfirm = vi.fn().mockResolvedValue(false);

    const result = unsavedChangesGuard(
      {
        hasUnsavedChanges: () => true,
        confirmUnsavedChanges: componentConfirm,
      },
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(result).resolves.toBe(false);
    expect(componentConfirm).toHaveBeenCalledOnce();
    expect(confirm).not.toHaveBeenCalled();
  });
});
