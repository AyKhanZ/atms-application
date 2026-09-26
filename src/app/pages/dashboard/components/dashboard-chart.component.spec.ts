import { TestBed } from '@angular/core/testing';

let DashboardChartComponent: typeof import('./dashboard-chart.component').DashboardChartComponent;

interface MockDataset {
  data: number[];
}

const chartMocks = vi.hoisted(() => ({
  instances: [] as {
    update: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
    data: { labels: string[]; datasets: MockDataset[] };
  }[],
}));

vi.mock('chart.js', () => ({
  registerables: [],
  Chart: class {
    static register(): void {}

    data: { labels: string[]; datasets: MockDataset[] };
    options: object;
    update = vi.fn();
    destroy = vi.fn();

    constructor(
      _canvas: HTMLCanvasElement,
      configuration: { data: { labels: string[]; datasets: MockDataset[] }; options: object },
    ) {
      this.data = configuration.data;
      this.options = configuration.options;
      chartMocks.instances.push(this);
    }
  },
}));

describe('DashboardChartComponent', () => {
  beforeEach(async () => {
    ({ DashboardChartComponent } = await import('./dashboard-chart.component'));
    chartMocks.instances.length = 0;
    TestBed.configureTestingModule({ imports: [DashboardChartComponent] });
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
    expect(chartMocks.instances).toHaveLength(1);
    const chart = chartMocks.instances[0];

    fixture.componentRef.setInput('labels', ['24 Sep', '25 Sep']);
    fixture.componentRef.setInput('series', [{ label: 'Tasks', values: [1, 2], color: '--orange' }]);
    fixture.detectChanges();

    expect(chartMocks.instances).toHaveLength(1);
    expect(chart.data.labels).toEqual(['24 Sep', '25 Sep']);
    expect(chart.update).toHaveBeenCalledWith('none');

    fixture.destroy();
    expect(chart.destroy).toHaveBeenCalledOnce();
  });

  it('draws an empty doughnut as a full grey ring instead of nothing', () => {
    create('doughnut', ['New', 'Done'], [0, 0]);

    expect(chartMocks.instances[0].data.datasets[0].data).toEqual([1]);
  });

  it('keeps the axis of an empty bar chart', () => {
    create('bar', ['Alpha'], [0]);

    expect(chartMocks.instances[0].data.labels).toEqual(['']);
    expect(chartMocks.instances[0].data.datasets[0].data).toEqual([0]);
  });

  it('cuts a long bar label on the axis', () => {
    create('bar', ['#7 Payment Gateway Integration for every region'], [3]);

    expect(chartMocks.instances[0].data.labels[0]).toBe('#7 Payment Gateway Inte…');
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
