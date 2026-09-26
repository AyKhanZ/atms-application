import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { Chart, ChartConfiguration, ChartDataset, ChartType, LegendItem, registerables } from 'chart.js';

Chart.register(...registerables);

export interface DashboardChartSeries {
  label: string;
  values: number[];
  /** CSS variable of the series colour, e.g. `--orange`. */
  color: string;
}

type ChartKind = 'line' | 'doughnut' | 'bar';

const barLabelLength = 24;
const doughnutLegendBesideMinWidth = 320;

/**
 * One Chart.js chart that fills the box its card gives it and never sizes that box itself.
 *
 * The canvas is positioned out of the layout (see the styles), so the card decides the height and
 * the chart follows. When the canvas takes part in the layout, Chart.js and the card grow each other
 * on every resize and the chart gets taller with each window change.
 */
@Component({
  selector: 'app-dashboard-chart',
  templateUrl: './dashboard-chart.component.html',
  styleUrl: './dashboard-chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardChartComponent implements OnDestroy {
  private readonly document = inject(DOCUMENT);
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private chart: Chart | null = null;
  private renderedKind: ChartKind | null = null;

  readonly kind = input.required<ChartKind>();
  readonly title = input.required<string>();
  readonly labels = input.required<string[]>();
  /** Full labels for tooltips when the axis shows short ones. */
  readonly tooltipLabels = input<string[]>([]);
  readonly series = input.required<DashboardChartSeries[]>();
  /** Per-item colours of a doughnut or bar chart, as CSS variables. */
  readonly colors = input<string[]>([]);
  readonly disabledIndices = input<number[]>([]);
  readonly selected = output<number>();
  readonly ariaLabel = computed(() => {
    const title = this.title();
    const series = this.series();
    if (this.kind() === 'line') {
      const totals = series.map(
        (item) => `${item.label} ${item.values.reduce((sum, value) => sum + value, 0)}`,
      );
      return `${title}: ${totals.join(', ')}`;
    }
    const values = this.labels().map(
      (label, index) => `${label} ${series[0]?.values[index] ?? 0}`,
    );
    return `${title}: ${values.join(', ')}`;
  });

  constructor() {
    effect(() => this.render());
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
    this.chart = null;
    this.renderedKind = null;
  }

  private render(): void {
    const canvas = this.canvas().nativeElement;
    const kind = this.kind();
    const config = this.config(kind);

    if (this.chart && this.renderedKind === kind) {
      this.chart.data = config.data;
      this.chart.options = config.options ?? {};
      this.chart.update('none');
      return;
    }

    this.chart?.destroy();
    this.chart = new Chart(canvas, config);
    this.renderedKind = kind;
  }

  private config(kind: ChartKind): ChartConfiguration<ChartType> {
    const styles = getComputedStyle(this.document.documentElement);
    const token = (name: string) => styles.getPropertyValue(name).trim() || '#999999';
    const muted = token('--app-muted');
    const border = token('--app-border');
    const text = token('--app-text');
    const surface = token('--app-surface');
    const font = { family: getComputedStyle(this.document.body).fontFamily, size: 12 };
    const labels = this.labels();
    const tooltipLabels = this.tooltipLabels();
    const series = this.series();
    const colors = this.colors().map(token);
    const disabled = this.disabledIndices();
    const values = series[0]?.values ?? [];
    // An empty chart is still drawn — a grey ring or an empty axis — so the card keeps its shape.
    const isEmpty = !series.some((item) => item.values.some((value) => value > 0));
    const titleOf = (index: number) => tooltipLabels[index] ?? labels[index] ?? '';

    const tooltip = {
      enabled: kind === 'line' || !isEmpty,
      backgroundColor: surface,
      titleColor: text,
      bodyColor: text,
      borderColor: border,
      borderWidth: 1,
      padding: 10,
      boxPadding: 4,
      usePointStyle: true,
      titleFont: { ...font, weight: 600 as const },
      bodyFont: font,
    };

    const clickable = (index: number | undefined): index is number =>
      kind !== 'line' && !isEmpty && index !== undefined && !disabled.includes(index);
    const interaction = {
      onClick: (_event: unknown, elements: { index: number }[]) => {
        const index = elements[0]?.index;
        if (clickable(index)) this.selected.emit(index);
      },
      onHover: (event: { native: Event | null }, elements: { index: number }[]) => {
        const target = event.native?.target;
        if (target instanceof HTMLElement) {
          target.style.cursor = clickable(elements[0]?.index) ? 'pointer' : 'default';
        }
      },
    };

    if (kind === 'line') {
      const dense = labels.length > 40;
      const line: ChartConfiguration<'line'> = {
        type: 'line',
        data: {
          labels,
          datasets: series.map((item): ChartDataset<'line'> => {
            const color = token(item.color);
            return {
              label: item.label,
              data: item.values,
              borderColor: color,
              backgroundColor: withAlpha(color, 0.12),
              pointBackgroundColor: color,
              pointBorderColor: surface,
              pointRadius: dense ? 0 : 2.5,
              pointHoverRadius: 5,
              borderWidth: 2,
              fill: 'origin',
              tension: 0.34,
            };
          }),
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          interaction: { mode: 'index', intersect: false },
          layout: { padding: { top: 4, right: 4 } },
          plugins: {
            legend: {
              position: 'top',
              align: 'end',
              labels: { color: muted, font, usePointStyle: true, boxWidth: 8, boxHeight: 8 },
            },
            tooltip: { ...tooltip, callbacks: { title: (items) => titleOf(items[0]?.dataIndex ?? 0) } },
          },
          scales: {
            x: {
              grid: { display: false },
              border: { color: border },
              ticks: { color: muted, font, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
            },
            y: {
              beginAtZero: true,
              suggestedMax: 4,
              grid: { color: border },
              border: { display: false },
              ticks: { color: muted, font, precision: 0, padding: 6 },
            },
          },
        },
      };
      return line as ChartConfiguration<ChartType>;
    }

    if (kind === 'doughnut') {
      // The legend always lists every category with its count, even when all of them are zero.
      const legendItems = (): LegendItem[] =>
        labels.map((label, index) => ({
          text: `${label}  ${values[index] ?? 0}`,
          fillStyle: colors[index],
          strokeStyle: colors[index],
          fontColor: text,
          pointStyle: 'circle',
          hidden: false,
          index,
          lineWidth: 0,
        }));
      const doughnut: ChartConfiguration<'doughnut'> = {
        type: 'doughnut',
        data: {
          labels: isEmpty ? [''] : labels,
          datasets: [
            {
              data: isEmpty ? [1] : values,
              backgroundColor: isEmpty ? [border] : colors,
              borderColor: surface,
              borderWidth: 2,
              hoverOffset: isEmpty ? 0 : 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          cutout: '68%',
          layout: { padding: 6 },
          // Beside a narrow ring the legend squeezes it to a dot; below it the ring keeps its size.
          onResize: (chart, size) => {
            const legend = chart.options.plugins?.legend;
            const position = size.width < doughnutLegendBesideMinWidth ? 'bottom' : 'right';
            if (legend && legend.position !== position) {
              legend.position = position;
              chart.update('none');
            }
          },
          plugins: {
            legend: {
              position:
                canvasWidth(this.canvas().nativeElement) < doughnutLegendBesideMinWidth
                  ? 'bottom'
                  : 'right',
              align: 'center',
              labels: {
                color: text,
                font,
                usePointStyle: true,
                boxWidth: 8,
                boxHeight: 8,
                padding: 12,
                generateLabels: legendItems,
              },
              onClick: (_event, item) => {
                if (clickable(item.index)) this.selected.emit(item.index);
              },
            },
            tooltip,
          },
          ...interaction,
        },
      };
      return doughnut as ChartConfiguration<ChartType>;
    }

    const bar: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: isEmpty ? [''] : labels.map((label) => shorten(label, barLabelLength)),
        datasets: [
          {
            data: isEmpty ? [0] : values,
            backgroundColor: isEmpty ? [border] : colors,
            borderRadius: 6,
            borderSkipped: false,
            maxBarThickness: 22,
            categoryPercentage: 0.72,
            barPercentage: 0.9,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        indexAxis: 'y',
        layout: { padding: { right: 8 } },
        plugins: {
          legend: { display: false },
          tooltip: {
            ...tooltip,
            callbacks: {
              title: (items) => titleOf(items[0]?.dataIndex ?? 0),
              label: (item) => ` ${item.parsed.x} ${item.parsed.x === 1 ? 'task' : 'tasks'}`,
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            suggestedMax: 5,
            grid: { color: border },
            border: { display: false },
            ticks: { color: muted, font, precision: 0 },
          },
          y: {
            grid: { display: false },
            border: { color: border },
            ticks: { color: text, font, autoSkip: false },
          },
        },
        ...interaction,
      },
    };
    return bar as ChartConfiguration<ChartType>;
  }
}

function canvasWidth(canvas: HTMLCanvasElement): number {
  return canvas.parentElement?.clientWidth ?? canvas.clientWidth;
}

function shorten(label: string, length: number): string {
  return label.length > length ? `${label.slice(0, length - 1)}…` : label;
}

/** `#rrggbb` → `rgba(r, g, b, alpha)`; any other colour is returned as it is. */
function withAlpha(color: string, alpha: number): string {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color);
  if (!match) return color;
  const [red, green, blue] = match.slice(1).map((part) => parseInt(part, 16));
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
