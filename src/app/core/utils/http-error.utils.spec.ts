import { HttpErrorResponse } from '@angular/common/http';
import { validationMessage, serverErrorMessage } from './http-error.utils';

describe('validationMessage', () => {
  it('gives the first message the server sent for a refused request', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: { errors: [{ field: 'id' }, { field: 'id', error: 'Delete the subtasks first.' }] },
    });

    expect(validationMessage(error)).toBe('Delete the subtasks first.');
  });

  it('has nothing to say for other failures', () => {
    expect(validationMessage(new HttpErrorResponse({ status: 500 }))).toBeNull();
    expect(validationMessage(new HttpErrorResponse({ status: 400, error: null }))).toBeNull();
  });

  // A dialog shows one line: the field the user is editing matters more than the first in the list.
  it('prefers the message of the field asked for', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: {
        errors: [
          { field: 'milestoneId', error: 'Milestone is required.' },
          { field: 'Title', error: 'Title is taken.' },
        ],
      },
    });

    expect(validationMessage(error, 'title')).toBe('Title is taken.');
    expect(validationMessage(error, 'deadline')).toBe('Milestone is required.');
  });
});

describe('serverErrorMessage', () => {
  it('reads a plain string body', () => {
    const error = new HttpErrorResponse({ status: 404, error: 'User not found.' });

    expect(serverErrorMessage(error, 'fallback')).toBe('User not found.');
  });

  it('reads an { error } body', () => {
    const error = new HttpErrorResponse({
      status: 423,
      error: { error: 'Locked for 15 minutes.' },
    });

    expect(serverErrorMessage(error, 'fallback')).toBe('Locked for 15 minutes.');
  });

  it('falls back when the server said nothing usable', () => {
    expect(serverErrorMessage(new HttpErrorResponse({ status: 500 }), 'fallback')).toBe('fallback');
    expect(serverErrorMessage(new HttpErrorResponse({ status: 500, error: '' }), 'fallback')).toBe(
      'fallback',
    );
  });
});
