import { DestroyRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { FilterOption } from './components/task-filters/filter-option';
import { OptionsPage, RemoteOptions } from './remote-options';

const option = (id: string): FilterOption => ({ value: id, label: `#${id}` });

describe('RemoteOptions', () => {
  function setup(pages: Record<string, OptionsPage>) {
    const fetch = vi.fn((term: string, next: string | null) => of(pages[`${term}|${next ?? ''}`]));
    const resolve = vi.fn((id: string) => of(option(id)));
    const options = TestBed.runInInjectionContext(
      () => new RemoteOptions(fetch, resolve, TestBed.inject(DestroyRef)),
    );
    return { options, fetch, resolve };
  }

  afterEach(() => vi.useRealTimers());

  it('reads the first page, then the next one when asked for more', () => {
    const { options } = setup({
      '|': { options: [option('1')], next: 'p2' },
      '|p2': { options: [option('2')], next: null },
    });

    options.reload();
    expect(options.options().map((item) => item.value)).toEqual(['1']);
    expect(options.hasMore()).toBe(true);

    options.more();
    expect(options.options().map((item) => item.value)).toEqual(['1', '2']);
    expect(options.hasMore()).toBe(false);
  });

  it('asks the server once the user pauses typing, not on every key', () => {
    vi.useFakeTimers();
    const { options, fetch } = setup({ 'pay|': { options: [option('7')], next: null } });

    options.search('p');
    options.search('pa');
    options.search('pay');
    vi.advanceTimersByTime(300);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('pay', null);
    expect(options.options().map((item) => item.value)).toEqual(['7']);
  });

  it('keeps a chosen option named when the page does not hold it, reading it only once', () => {
    const { options, resolve } = setup({ '|': { options: [option('1')], next: null } });
    options.reload();

    options.choose(['9']);
    options.choose(['9']);

    expect(resolve).toHaveBeenCalledTimes(1);
    expect(options.options().map((item) => item.value)).toEqual(['9', '1']);
  });
});
