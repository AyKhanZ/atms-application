import { TestBed } from '@angular/core/testing';
import { DashboardChartComponent } from './dashboard-chart.component';

const chartMocks = vi.hoisted(() => ({
  instances: [] as {
    update: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
    data: { labels: string[]; datasets: unknown[] };
  }[],
}));

vi.mock('chart.js', () => ({
  registerables: [],
  Chart: class {
    static register(): void {}

    data: { labels: string[]; datasets: unknown[] };
    options: object;
    update = vi.fn();
    destroy = vi.fn();

    constructor(
      _canvas: HTMLCanvasElement,
      configuration: { data: { labels: string[]; datasets: unknown[] }; options: object },
    ) {
      this.data = configuration.data;
      this.options = configuration.options;
      chartMocks.instances.push(this);
    }
  },
}));

describe('DashboardChartComponent', () => {
  beforeEach(() => {
    chartMocks.instances.length = 0;
    TestBed.configureTestingModule({ imports: [DashboardChartComponent] });
  });

  it('updates the same chart for new data and destroys it on departure', () => {
    const fixture = TestBed.createComponent(DashboardChartComponent);
    fixture.componentRef.setInput('kind', 'line');
    fixture.componentRef.setInput('labels', ['2026-09-24']);
    fixture.componentRef.setInput('values', [1]);
    fixture.detectChanges();

    expect(chartMocks.instances).toHaveLength(1);
    const chart = chartMocks.instances[0];

    fixture.componentRef.setInput('labels', ['2026-09-24', '2026-09-25']);
    fixture.componentRef.setInput('values', [1, 2]);
    fixture.detectChanges();

    expect(chartMocks.instances).toHaveLength(1);
    expect(chart.data.labels).toEqual(['2026-09-24', '2026-09-25']);
    expect(chart.update).toHaveBeenCalledWith('none');

    fixture.destroy();
    expect(chart.destroy).toHaveBeenCalledOnce();
  });
});
