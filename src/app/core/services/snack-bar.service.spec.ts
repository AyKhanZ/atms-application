import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { SnackBarService } from './snack-bar.service';

describe('SnackBarService', () => {
  let add: ReturnType<typeof vi.fn>;
  let snackBar: SnackBarService;

  beforeEach(() => {
    add = vi.fn();
    TestBed.configureTestingModule({
      providers: [SnackBarService, { provide: MessageService, useValue: { add } }],
    });
    snackBar = TestBed.inject(SnackBarService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the same text only once when it is repeated straight away', () => {
    snackBar.warn('Too many requests.');
    snackBar.error('Too many requests.');

    expect(add).toHaveBeenCalledTimes(1);
    expect(add).toHaveBeenCalledWith(expect.objectContaining({ detail: 'Too many requests.' }));
  });

  it('shows a different text', () => {
    snackBar.warn('Too many requests.');
    snackBar.error('Could not save.');

    expect(add).toHaveBeenCalledTimes(2);
    expect(add).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ detail: 'Too many requests.', severity: 'warn' }),
    );
    expect(add).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ detail: 'Could not save.', severity: 'error' }),
    );
  });

  it('shows the same text again once 3 seconds have passed', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-10T12:00:00Z'));

    snackBar.warn('Too many requests.');
    vi.setSystemTime(new Date('2026-10-10T12:00:03Z'));
    snackBar.error('Too many requests.');

    expect(add).toHaveBeenCalledTimes(2);
  });
});
