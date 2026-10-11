import { TestBed } from '@angular/core/testing';

import { translocoTestingProviders } from '../../../core/testing/transloco-testing';
import { CHART_FACTORY, DashboardChartComponent } from './dashboard-chart.component';

interface MockChart {
  update: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
  data: { labels: string[]; datasets: { data: number[] }[] };
  options: object;
}

describe('DashboardChartComponent', () => {
  let charts: MockChart[];

  beforeEach(() => {
    charts = [];
    TestBed.configureTestingModule({
      providers: [
        ...translocoTestingProviders(),
        {
          provide: CHART_FACTORY,
          useValue: (_canvas: HTMLCanvasElement, config: Omit<MockChart, 'update' | 'destroy'>) => {
            const chart = { ...config, update: vi.fn(), destroy: vi.fn() };
            charts.push(chart);
            return chart;
          },
        },
      ],
      imports: [DashboardChartComponent],
    });
  });

  function create(kind: 'line' | 'doughnut' | 'bar', labels: string[], values: number[]) {
    const fixture = TestBed.createComponent(DashboardChartComponent);
    fixture.componentRef.setInput('kind', kind);
    fixture.componentRef.setInput('title', 'Tasks not done by priority');
    fixture.componentRef.setInput('labels', labels);
    fixture.componentRef.setInput('series', [{ label: 'Tasks', values, color: '--orange' }]);
    fixture.detectChanges();
    return fixture;
  }

  it('updates the same chart for new data and destroys it on departure', () => {
    const fixture = create('line', ['24 Sep'], [1]);
    expect(charts).toHaveLength(1);
    const chart = charts[0];

    fixture.componentRef.setInput('labels', ['24 Sep', '25 Sep']);
    fixture.componentRef.setInput('series', [{ label: 'Tasks', values: [1, 2], color: '--orange' }]);
    fixture.detectChanges();

    expect(charts).toHaveLength(1);
    expect(chart.data.labels).toEqual(['24 Sep', '25 Sep']);
    expect(chart.update).toHaveBeenCalledWith('none');

    fixture.destroy();
    expect(chart.destroy).toHaveBeenCalledOnce();
  });

  it('draws an empty doughnut as a full grey ring instead of nothing', () => {
    create('doughnut', ['New', 'Done'], [0, 0]);

    expect(charts[0].data.datasets[0].data).toEqual([1]);
  });

  it('keeps the axis of an empty bar chart', () => {
    create('bar', ['Alpha'], [0]);

    expect(charts[0].data.labels).toEqual(['']);
    expect(charts[0].data.datasets[0].data).toEqual([0]);
  });

  it('cuts a long bar label on the axis', () => {
    create('bar', ['#7 Payment Gateway Integration for every region'], [3]);

    expect(charts[0].data.labels[0]).toBe('#7 Payment Gateway Inte…');
  });

  it('exposes a chart summary and a hidden table of its values', () => {
    const fixture = create('doughnut', ['High', 'Medium', 'Low'], [12, 30, 5]);
    const canvas = fixture.nativeElement.querySelector('canvas') as HTMLCanvasElement;
    const table = fixture.nativeElement.querySelector('table') as HTMLTableElement;

    expect(canvas.getAttribute('role')).toBe('img');
    expect(canvas.getAttribute('aria-label')).toBe(
      'Tasks not done by priority: High 12, Medium 30, Low 5',
    );
    expect(table.textContent).toContain('Medium');
    expect(table.textContent).toContain('30');
  });
});
