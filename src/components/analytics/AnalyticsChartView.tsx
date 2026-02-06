import { useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { AnalyticsChart, DateRangeOption } from '../../types';
import { getMetricData, AVAILABLE_METRICS } from './analyticsMetrics';
import { movingAverage } from '../../utils/calculations';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
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
        <LineChart data={chartData} margin={{ top: 5, right: hasRightAxis ? 60 : 20, bottom: 5, left: 20 }}>
          <CartesianGrid stroke="var(--border-color)" strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
            tickFormatter={(val: string) => {
              const d = new Date(val + 'T12:00:00');
              return `${d.getMonth() + 1}/${d.getDate()}`;
            }}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
            width={50}
            domain={axisDomain.left || ['auto', 'auto']}
          />
          {hasRightAxis && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
              width={50}
              domain={axisDomain.right || ['auto', 'auto']}
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
            return (
              <Line
                key={metric.key}
                yAxisId={metric.axis === 'right' ? 'right' : 'left'}
                type="monotone"
                dataKey={metric.key}
                stroke={metric.color}
                strokeWidth={2}
                dot={false}
                name={metric.label || metricDef?.label || metric.key}
                connectNulls
              />
            );
          })}
          {chart.showMovingAverage &&
            chart.metrics.map((metric) => (
              <Line
                key={`${metric.key}_ma`}
                yAxisId={metric.axis === 'right' ? 'right' : 'left'}
                type="monotone"
                dataKey={`${metric.key}_ma`}
                stroke={metric.color}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name={`${metric.label || metric.key} (MA ${chart.movingAverageDays}d)`}
                connectNulls
              />
            ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
