import { WorkItemKind } from '../../../../core/models/work-items';
import { FilterSummaryPipe } from './filter-summary.pipe';

describe('FilterSummaryPipe', () => {
  const pipe = new FilterSummaryPipe();
  const project = {
    value: 'p1',
    label: '#7 Payment Gateway',
    ref: { kind: WorkItemKind.Project, code: '7', title: 'Payment Gateway' },
  };

  it('is empty when nothing is chosen, so the placeholder shows', () => {
    expect(pipe.transform([])).toBe('');
    expect(pipe.transform(null)).toBe('');
  });

  it('names the first choice by its title and counts the rest', () => {
    expect(pipe.transform([project])).toBe('Payment Gateway');
    expect(pipe.transform([project, { value: 'p2', label: '#6 test65' }])).toBe(
      'Payment Gateway +1',
    );
  });

  it('falls back to the label without a reference', () => {
    expect(pipe.transform([{ value: 1, label: 'High' }])).toBe('High');
  });
});
