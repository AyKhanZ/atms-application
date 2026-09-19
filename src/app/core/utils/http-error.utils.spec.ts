import { HttpErrorResponse } from '@angular/common/http';
import { validationMessage } from './http-error.utils';

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
