import { useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { AnalyticsChart, DateRangeOption } from '../../types';
import { getMetricData, AVAILABLE_METRICS } from './analyticsMetrics';
import { movingAverage } from '../../utils/calculations';
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
  ReferenceLine,
} from 'recharts';

interface AnalyticsChartViewProps {
  chart: AnalyticsChart;
}

function getDateCutoff(range: DateRangeOption): string {
  if (range === 'ALL') return '1900-01-01';
  const now = new Date();
  const months: Record<string, number> = { '1M': 1, '3M': 3, '6M': 6, '12M': 12 };
  now.setMonth(now.getMonth() - (months[range] || 1));
  return now.toISOString().split('T')[0];
}

export function AnalyticsChartView({ chart }: AnalyticsChartViewProps) {
  const state = useStore();

  const chartData = useMemo(() => {
    const cutoff = getDateCutoff(chart.dateRange);
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

    const sortedDates = [...allDates].sort();
    return sortedDates.map((date) => {
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
  }, [chart, state.bodyEntries, state.mealEntries, state.macroTargets, state.workoutSessions, state.settings]);

  // Compute domain for left/right axes: fit to data range with 5% margin
  const axisDomain = useMemo(() => {
    const leftKeys = chart.metrics
      .filter((m) => m.axis !== 'right')
      .flatMap((m) => [m.key, chart.showMovingAverage ? `${m.key}_ma` : null].filter(Boolean) as string[]);
    const rightKeys = chart.metrics
      .filter((m) => m.axis === 'right')
      .flatMap((m) => [m.key, chart.showMovingAverage ? `${m.key}_ma` : null].filter(Boolean) as string[]);

    const getRange = (keys: string[]): [number, number] | undefined => {
      const values: number[] = [];
      chartData.forEach((point) => {
        keys.forEach((k) => {
          const v = point[k];
          if (typeof v === 'number' && isFinite(v)) values.push(v);
        });
      });
      if (values.length === 0) return undefined;
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min || Math.abs(max) * 0.1 || 1;
      const margin = range * 0.05;
      return [
        Math.floor((min - margin) * 100) / 100,
        Math.ceil((max + margin) * 100) / 100,
      ];
    };

    return {
      left: getRange(leftKeys),
      right: getRange(rightKeys),
    };
  }, [chartData, chart.metrics, chart.showMovingAverage]);

  // Compute X-axis ticks: Sundays for short ranges, 1st of month for longer
  const xTicks = useMemo(() => {
    if (chartData.length === 0) return [];
    const dates = chartData.map((d) => d.date as string);
    const first = dates[0];
    const last = dates[dates.length - 1];
    const span = (new Date(last).getTime() - new Date(first).getTime()) / (1000 * 60 * 60 * 24);
    const dateSet = new Set(dates);
    const ticks: string[] = [];

    if (span <= 120) {
      // Weekly: find Sundays within the data range
      const d = new Date(first + 'T12:00:00');
      // Advance to the next Sunday
      d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7));
      while (d.toISOString().split('T')[0] <= last) {
        const ds = d.toISOString().split('T')[0];
        // Find nearest date in data
        if (dateSet.has(ds)) {
          ticks.push(ds);
        } else {
          // Find closest date in data
          const closest = dates.reduce((prev, curr) =>
            Math.abs(new Date(curr).getTime() - d.getTime()) < Math.abs(new Date(prev).getTime() - d.getTime()) ? curr : prev
          );
          if (!ticks.includes(closest)) ticks.push(closest);
        }
        d.setDate(d.getDate() + 7);
      }
    } else {
      // Monthly: 1st of each month
      const startD = new Date(first + 'T12:00:00');
      const d = new Date(startD.getFullYear(), startD.getMonth() + 1, 1, 12);
      while (d.toISOString().split('T')[0] <= last) {
        const ds = d.toISOString().split('T')[0];
        if (dateSet.has(ds)) {
          ticks.push(ds);
        } else {
          const closest = dates.reduce((prev, curr) =>
            Math.abs(new Date(curr).getTime() - d.getTime()) < Math.abs(new Date(prev).getTime() - d.getTime()) ? curr : prev
          );
          if (!ticks.includes(closest)) ticks.push(closest);
        }
        d.setMonth(d.getMonth() + 1);
      }
    }
    return ticks;
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
    <div>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={chartData} margin={{ top: 5, right: hasRightAxis ? 5 : 5, bottom: 5, left: 0 }}>
          <CartesianGrid stroke="var(--border-color)" strokeDasharray="3 3" vertical={false} />
          {xTicks.map((tick) => (
            <ReferenceLine
              key={tick}
              x={tick}
              yAxisId="left"
              stroke="var(--border-color)"
              strokeDasharray="3 3"
            />
          ))}
          <XAxis
            dataKey="date"
            ticks={xTicks.length > 0 ? xTicks : undefined}
            tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
            tickFormatter={(val: string) => {
              const d = new Date(val + 'T12:00:00');
              const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
              return `${d.getDate()}-${months[d.getMonth()]}`;
            }}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
            width={40}
            domain={axisDomain.left || ['auto', 'auto']}
            tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : Number.isInteger(v) ? String(v) : v.toFixed(1)}
          />
          {hasRightAxis && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
              width={40}
              domain={axisDomain.right || ['auto', 'auto']}
              tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : Number.isInteger(v) ? String(v) : v.toFixed(1)}
            />
          )}
          <Tooltip
            contentStyle={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 8,
              fontSize: 12,
            }}
          />
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
                  fill={hasMA ? `${metric.color}33` : `${metric.color}99`}
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
                stroke={hasMA ? `${metric.color}33` : metric.color}
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
              const isBar = (metric.chartType || 'line') === 'bar';
              // No MA line for bar metrics
              if (isBar) return null;
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
