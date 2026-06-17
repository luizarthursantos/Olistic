import { useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { AnalyticsChart, DateRangeOption } from '../../types';
import { getMetricData, AVAILABLE_METRICS } from './analyticsMetrics';
import { movingAverage, toLocalDateStr } from '../../utils/calculations';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';

interface AnalyticsChartViewProps {
  chart: AnalyticsChart;
  dateRange: DateRangeOption;
  fullscreen?: boolean;
  interactive?: boolean;
}

function getDateCutoff(range: DateRangeOption): string {
  if (range === 'ALL') return '1900-01-01';
  const now = new Date();
  const months: Record<string, number> = { '1M': 1, '2M': 2, '3M': 3, '6M': 6, '12M': 12, '36M': 36 };
  now.setMonth(now.getMonth() - (months[range] || 1));
  return toLocalDateStr(now);
}

export function AnalyticsChartView({ chart, dateRange, fullscreen, interactive }: AnalyticsChartViewProps) {
  const state = useStore();
  const lineAlphaHex = Math.round(((state.settings.chartLineAlpha ?? 60) / 100) * 255)
    .toString(16).padStart(2, '0');

  const chartData = useMemo(() => {
    const cutoff = getDateCutoff(dateRange);
    const allDates = new Set<string>();
    const metricSeries: Record<string, Record<string, number>> = {};
    const maSeries: Record<string, Record<string, number>> = {};

    chart.metrics.forEach((metric) => {
      const raw = getMetricData(metric.key, {
        bodyEntries: state.bodyEntries,
        mealEntries: state.mealEntries,
        macroTargets: state.macroTargets,
        workoutSessions: state.workoutSessions,
        settings: state.settings,
        exercises: state.exercises,
      }, metric.exerciseId);

      const filtered = raw.filter((d) => d.date >= cutoff).sort((a, b) => a.date.localeCompare(b.date));
      metricSeries[metric.key] = {};
      filtered.forEach((d) => {
        allDates.add(d.date);
        metricSeries[metric.key][d.date] = d.value;
      });

      if (chart.showMovingAverage && chart.movingAverageDays > 0) {
        const ma = movingAverage(filtered, chart.movingAverageDays);
        maSeries[metric.key] = {};
        ma.forEach((d) => {
          maSeries[metric.key][d.date] = d.value;
        });
      }
    });

    // Fill in ALL calendar dates between min and max so the x-axis is proportional to time
    const sortedDates = [...allDates].sort();
    if (sortedDates.length === 0) return [];
    const allCalendarDates: string[] = [];
    const d = new Date(sortedDates[0] + 'T12:00:00');
    const endDate = sortedDates[sortedDates.length - 1];
    while (toLocalDateStr(d) <= endDate) {
      allCalendarDates.push(toLocalDateStr(d));
      d.setDate(d.getDate() + 1);
    }

    return allCalendarDates.map((date) => {
      const point: Record<string, string | number> = { date };
      chart.metrics.forEach((metric) => {
        if (metricSeries[metric.key]?.[date] !== undefined) {
          point[metric.key] = metricSeries[metric.key][date];
        }
        if (maSeries[metric.key]?.[date] !== undefined) {
          point[`${metric.key}_ma`] = maSeries[metric.key][date];
        }
      });
      return point;
    });
  }, [chart, dateRange, state.bodyEntries, state.mealEntries, state.macroTargets, state.workoutSessions, state.settings]);

  // Compute domain and nice ticks (multiples of 5 or 10) for left/right axes
  const axisConfig = useMemo(() => {
    const leftKeys = chart.metrics
      .filter((m) => m.axis !== 'right')
      .flatMap((m) => [m.key, chart.showMovingAverage ? `${m.key}_ma` : null].filter(Boolean) as string[]);
    const rightKeys = chart.metrics
      .filter((m) => m.axis === 'right')
      .flatMap((m) => [m.key, chart.showMovingAverage ? `${m.key}_ma` : null].filter(Boolean) as string[]);

    const niceTicks = (keys: string[], includeZero: boolean): { domain: [number, number]; ticks: number[] } | undefined => {
      const values: number[] = [];
      chartData.forEach((point) => {
        keys.forEach((k) => {
          const v = point[k];
          if (typeof v === 'number' && isFinite(v)) values.push(v);
        });
      });
      if (values.length === 0) return undefined;
      let dataMin = Math.min(...values);
      let dataMax = Math.max(...values);
      if (includeZero) {
        dataMin = Math.min(dataMin, 0);
        dataMax = Math.max(dataMax, 0);
      }
      const range = dataMax - dataMin || Math.abs(dataMax) * 0.1 || 1;

      // Pick a step that is a clean integer (never < 1)
      const targetTicks = 5;
      const rawStep = range / targetTicks;
      const magnitude = Math.pow(10, Math.floor(Math.log10(Math.max(rawStep, 1))));
      const candidates = [1, 2, 5, 10].map((m) => m * magnitude);
      const step = Math.max(1, candidates.find((c) => c >= rawStep) || candidates[candidates.length - 1]);

      const lo = Math.floor(dataMin / step) * step;
      const hi = Math.ceil(dataMax / step) * step;
      const ticks: number[] = [];
      for (let v = lo; v <= hi + step * 0.01; v += step) {
        ticks.push(Math.round(v * 1e6) / 1e6);
      }
      return { domain: [ticks[0], ticks[ticks.length - 1]], ticks };
    };

    return {
      left: niceTicks(leftKeys, !!chart.includeZeroLeft),
      right: niceTicks(rightKeys, !!chart.includeZeroRight),
    };
  }, [chartData, chart.metrics, chart.showMovingAverage, chart.includeZeroLeft, chart.includeZeroRight]);

  // Compute X-axis ticks: Sundays for short ranges, 1st of month for longer
  const xTicks = useMemo(() => {
    if (chartData.length === 0) return [];
    const first = chartData[0].date as string;
    const last = chartData[chartData.length - 1].date as string;
    const span = (new Date(last).getTime() - new Date(first).getTime()) / (1000 * 60 * 60 * 24);
    const ticks: string[] = [];

    if (span <= 60) {
      // Weekly: find Sundays
      const d = new Date(first + 'T12:00:00');
      d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7));
      while (toLocalDateStr(d) <= last) {
        ticks.push(toLocalDateStr(d));
        d.setDate(d.getDate() + 7);
      }
    } else if (span <= 365) {
      // Monthly: 1st of each month
      const startD = new Date(first + 'T12:00:00');
      const d = new Date(startD.getFullYear(), startD.getMonth() + 1, 1, 12);
      while (toLocalDateStr(d) <= last) {
        ticks.push(toLocalDateStr(d));
        d.setMonth(d.getMonth() + 1);
      }
    } else {
      // Quarterly for very long ranges
      const startD = new Date(first + 'T12:00:00');
      let m = startD.getMonth();
      const nextQ = m + (3 - (m % 3));
      const d = new Date(startD.getFullYear(), nextQ, 1, 12);
      while (toLocalDateStr(d) <= last) {
        ticks.push(toLocalDateStr(d));
        d.setMonth(d.getMonth() + 3);
      }
    }
    return ticks;
  }, [chartData]);

  const xSpansMultipleYears = useMemo(() => {
    if (chartData.length < 2) return false;
    const firstYear = new Date((chartData[0].date as string) + 'T12:00:00').getFullYear();
    const lastYear = new Date((chartData[chartData.length - 1].date as string) + 'T12:00:00').getFullYear();
    return firstYear !== lastYear;
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <div className="text-center text-muted" style={{ padding: 40 }}>
        No data for the selected metrics and date range
      </div>
    );
  }

  const hasRightAxis = chart.metrics.some((m) => m.axis === 'right');

  return (
    <div style={{ ...(fullscreen ? { width: '100%', height: '100%' } : {}), ...(interactive === false ? { pointerEvents: 'none' } : {}) }}>
      <ResponsiveContainer width="100%" height={fullscreen ? '100%' : 280}>
        <ComposedChart data={chartData} margin={{ top: 5, right: hasRightAxis ? 5 : 5, bottom: 5, left: 0 }}>
          <CartesianGrid stroke="var(--border-color)" strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            ticks={xTicks.length > 0 ? xTicks : undefined}
            tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
            tickFormatter={(val: string) => {
              const d = new Date(val + 'T12:00:00');
              const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
              const label = `${d.getDate()}-${months[d.getMonth()]}`;
              if (xSpansMultipleYears) {
                return `${label}-${String(d.getFullYear()).slice(2)}`;
              }
              return label;
            }}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
            width={40}
            domain={axisConfig.left?.domain || ['auto', 'auto']}
            ticks={axisConfig.left?.ticks}
            tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v))}
          />
          {hasRightAxis && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
              width={40}
              domain={axisConfig.right?.domain || ['auto', 'auto']}
              ticks={axisConfig.right?.ticks}
              tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v))}
            />
          )}
          {interactive !== false && (
            <Tooltip
              contentStyle={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 8,
                fontSize: 12,
              }}
            />
          )}
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {chart.metrics.map((metric) => {
            const metricDef = AVAILABLE_METRICS.find((m) => m.key === metric.key);
            const hasMA = chart.showMovingAverage;
            const isBar = (metric.chartType || 'line') === 'bar';
            const yAxisId = metric.axis === 'right' ? 'right' : 'left';
            const name = metric.label || metricDef?.label || metric.key;

            if (isBar) {
              return (
                <Bar
                  key={metric.key}
                  yAxisId={yAxisId}
                  dataKey={metric.key}
                  fill={hasMA ? `${metric.color}${lineAlphaHex}` : `${metric.color}99`}
                  name={name}
                />
              );
            }

            return (
              <Line
                key={metric.key}
                yAxisId={yAxisId}
                type={hasMA ? 'linear' : 'monotone'}
                dataKey={metric.key}
                stroke={hasMA ? `${metric.color}${lineAlphaHex}` : metric.color}
                strokeWidth={hasMA ? 1 : 2}
                dot={false}
                name={name}
                connectNulls
              />
            );
          })}
          {chart.showMovingAverage &&
            chart.metrics.map((metric) => {
              const metricDef = AVAILABLE_METRICS.find((m) => m.key === metric.key);
              return (
                <Line
                  key={`${metric.key}_ma`}
                  yAxisId={metric.axis === 'right' ? 'right' : 'left'}
                  type="monotone"
                  dataKey={`${metric.key}_ma`}
                  stroke={metric.color}
                  strokeWidth={2.5}
                  dot={false}
                  name={`${metric.label || metricDef?.label || metric.key} (MA ${chart.movingAverageDays}d)`}
                  connectNulls
                />
              );
            })}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
