import { HttpErrorResponse } from '@angular/common/http';
import {
  isServerUnavailable,
  isTooManyRequests,
  serverErrorMessage,
  toMutationError,
  validationErrorExcept,
  validationErrorFor,
  validationMessage,
} from './http-error.utils';

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

describe('validationErrorFor', () => {
  const error = new HttpErrorResponse({
    status: 400,
    error: {
      errors: [
        { field: 'PhoneNumber', error: 'Enter a valid international phone number.' },
        { field: 'Name', error: 'Name is required.' },
      ],
    },
  });

  it('reads one field and ignores the rest', () => {
    expect(validationErrorFor(error, 'phonenumber')).toBe('Enter a valid international phone number.');
    expect(validationErrorExcept(error, 'PhoneNumber')).toBe('Name is required.');
  });

  it('is empty when that field was not refused', () => {
    expect(validationErrorFor(error, 'Position')).toBeNull();
    expect(validationErrorFor(new HttpErrorResponse({ status: 500 }), 'PhoneNumber')).toBeNull();
  });
});

describe('isTooManyRequests', () => {
  it('is a 429 and nothing else', () => {
    expect(isTooManyRequests(new HttpErrorResponse({ status: 429 }))).toBe(true);
    expect(isTooManyRequests(new HttpErrorResponse({ status: 503 }))).toBe(false);
    expect(isServerUnavailable(new HttpErrorResponse({ status: 429 }))).toBe(false);
  });
});

describe('toMutationError', () => {
  it('keeps the server text when the limit is hit', () => {
    const error = new HttpErrorResponse({
      status: 429,
      error: { error: 'Too many requests. Try again in 12 s.' },
    });

    expect(toMutationError(error)).toEqual({
      status: 429,
      message: 'Too many requests. Try again in 12 s.',
    });
  });

  it('still reads a validation message for other statuses', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: { errors: [{ field: 'title', error: 'Title is taken.' }] },
    });

    expect(toMutationError(error)).toEqual({ status: 400, message: 'Title is taken.' });
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
