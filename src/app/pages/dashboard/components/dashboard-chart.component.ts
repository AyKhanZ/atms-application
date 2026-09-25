import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard-chart',
  templateUrl: './dashboard-chart.component.html',
  styleUrl: './dashboard-chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardChartComponent implements OnDestroy {
  private readonly document = inject(DOCUMENT);
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly themeRevision = signal(0);
  private readonly observer = new MutationObserver(() =>
    this.themeRevision.update((value) => value + 1),
  );
  private chart: Chart | null = null;
  private renderedKind: 'line' | 'doughnut' | 'bar' | null = null;

  readonly kind = input.required<'line' | 'doughnut' | 'bar'>();
  readonly labels = input.required<string[]>();
  readonly values = input.required<number[]>();
  readonly secondValues = input<number[]>([]);
  readonly colors = input<string[]>([]);
  readonly disabledIndices = input<number[]>([]);
  readonly selected = output<number>();

  constructor() {
    this.observer.observe(this.document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style'],
    });
    this.observer.observe(this.document.body, {
      attributes: true,
      attributeFilter: ['class', 'style'],
    });
    effect(() => {
      const canvas = this.canvas();
      const kind = this.kind();
      const labels = this.labels();
      const values = this.values();
      const secondValues = this.secondValues();
      const colors = this.colors();
      const disabledIndices = this.disabledIndices();
      this.themeRevision();
      if (!canvas) return;

      const color = (token: string) =>
        getComputedStyle(this.document.documentElement).getPropertyValue(token).trim();
      const muted = color('--app-muted');
      const border = color('--app-border');
      const orange = color('--orange');
      const palette = colors.map(color);
      const datasets =
        kind === 'line'
          ? [
              {
                label: 'Created',
                data: values,
                borderColor: muted,
                backgroundColor: muted,
                tension: 0.25,
                pointRadius: 0,
              },
              {
                label: 'Done',
                data: secondValues,
                borderColor: orange,
                backgroundColor: orange,
                tension: 0.25,
                pointRadius: 0,
              },
            ]
          : [
              {
                label: 'Tasks',
                data: values,
                backgroundColor: palette,
                borderColor: palette,
                borderWidth: kind === 'doughnut' ? 0 : 1,
              },
            ];
      const options = {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: kind === 'bar' ? ('y' as const) : ('x' as const),
        plugins: {
          legend: {
            display: kind === 'line',
            labels: {
              color: muted,
              font: { family: getComputedStyle(this.document.body).fontFamily },
            },
          },
        },
        scales:
          kind === 'doughnut'
            ? {}
            : {
                x: { ticks: { color: muted }, grid: { color: border } },
                y: {
                  beginAtZero: true,
                  ticks: { color: muted, precision: 0 },
                  grid: { color: border },
                },
              },
        onClick: (_event: unknown, elements: { index: number }[]) => {
          if (kind !== 'line' && elements[0] && !disabledIndices.includes(elements[0].index)) {
            this.selected.emit(elements[0].index);
          }
        },
        onHover: (_event: unknown, elements: { index: number }[]) => {
          canvas.nativeElement.style.cursor =
            kind !== 'line' && elements[0] && !disabledIndices.includes(elements[0].index)
              ? 'pointer'
              : 'default';
        },
      };

      if (this.chart && this.renderedKind === kind) {
        this.chart.data.labels = labels;
        this.chart.data.datasets = datasets;
        this.chart.options = options;
        this.chart.update('none');
      } else {
        this.chart?.destroy();
        this.chart = new Chart(canvas.nativeElement, {
          type: kind,
          data: { labels, datasets },
          options,
        });
        this.renderedKind = kind;
      }
    });
  }

  ngOnDestroy(): void {
    this.observer.disconnect();
    this.chart?.destroy();
    this.chart = null;
    this.renderedKind = null;
  }
}
