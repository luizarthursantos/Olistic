import jsPDF from 'jspdf';
import { Exercise, WorkoutSession, WorkoutTemplate } from '../types';
import { getBestOneRepMax } from './calculations';

interface ExerciseChartData {
  exercise: Exercise;
  points: { date: string; orm: number }[];
}

export function export1rmPdf(
  exercises: Exercise[],
  workoutSessions: WorkoutSession[],
  workoutTemplates: WorkoutTemplate[],
) {
  const now = new Date();
  const oneMonthAgo = new Date(now);
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const cutoff = oneMonthAgo.toISOString().slice(0, 10);

  const completedSessions = workoutSessions.filter(
    (s) => s.completed && s.date >= cutoff,
  );

  // Gather 1RM data per exercise (only non-cardio with completed sets)
  const exerciseDataMap = new Map<string, { date: string; orm: number }[]>();

  completedSessions.forEach((session) => {
    session.exercises.forEach((exSession) => {
      const exercise = exercises.find((e) => e.id === exSession.exerciseId);
      if (!exercise || exercise.isCardio) return;
      const completedSets = exSession.sets.filter((s) => s.completed && s.loadKg > 0);
      if (completedSets.length === 0) return;
      const best1RM = getBestOneRepMax(exSession.sets);
      if (best1RM <= 0) return;

      if (!exerciseDataMap.has(exSession.exerciseId)) {
        exerciseDataMap.set(exSession.exerciseId, []);
      }
      const existing = exerciseDataMap.get(exSession.exerciseId)!;
      // Keep max 1RM per date
      const existingIdx = existing.findIndex((p) => p.date === session.date);
      if (existingIdx >= 0) {
        existing[existingIdx].orm = Math.max(existing[existingIdx].orm, best1RM);
      } else {
        existing.push({ date: session.date, orm: best1RM });
      }
    });
  });

  // Build sorted chart data
  const chartDataList: ExerciseChartData[] = [];
  exerciseDataMap.forEach((points, exerciseId) => {
    const exercise = exercises.find((e) => e.id === exerciseId);
    if (!exercise) return;
    points.sort((a, b) => a.date.localeCompare(b.date));
    chartDataList.push({ exercise, points });
  });
  chartDataList.sort((a, b) => a.exercise.name.localeCompare(b.exercise.name));

  if (chartDataList.length === 0) return null;

  // Create PDF
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentW = pageW - margin * 2;

  // Title
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('1RM Report — Past Month', margin, 22);

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  const dateRange = `${formatDateShort(cutoff)} — ${formatDateShort(now.toISOString().slice(0, 10))}`;
  pdf.text(dateRange, margin, 29);

  // Summary
  const totalSessions = completedSessions.length;
  const totalExercises = chartDataList.length;
  pdf.setFontSize(10);
  pdf.text(`${totalSessions} sessions · ${totalExercises} exercises tracked`, margin, 35);

  let cursorY = 44;

  for (const { exercise, points } of chartDataList) {
    const chartH = 45;
    const blockH = chartH + 22; // title + chart + spacing

    // New page if needed
    if (cursorY + blockH > pageH - margin) {
      pdf.addPage();
      cursorY = margin;
    }

    // Exercise title
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${exercise.name}`, margin, cursorY);

    // Current & peak 1RM
    const current1RM = points[points.length - 1].orm;
    const peak1RM = Math.max(...points.map((p) => p.orm));
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Current: ${current1RM} kg · Peak: ${peak1RM} kg · ${points.length} session${points.length > 1 ? 's' : ''}`, margin, cursorY + 5);

    cursorY += 10;

    // Draw chart
    drawChart(pdf, margin, cursorY, contentW, chartH, points);

    cursorY += chartH + 12;
  }

  // Save
  const fileName = `1rm-report-${now.toISOString().slice(0, 10)}.pdf`;
  pdf.save(fileName);
  return fileName;
}

function drawChart(
  pdf: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  points: { date: string; orm: number }[],
) {
  const ormValues = points.map((p) => p.orm);
  const minOrm = Math.min(...ormValues);
  const maxOrm = Math.max(...ormValues);
  const range = maxOrm - minOrm || 1;
  const paddedMin = minOrm - range * 0.1;
  const paddedMax = maxOrm + range * 0.1;
  const yRange = paddedMax - paddedMin || 1;

  const labelW = 14;
  const bottomPad = 10;
  const chartX = x + labelW;
  const chartW = w - labelW;
  const chartH = h - bottomPad;

  // Background
  pdf.setFillColor(248, 248, 252);
  pdf.rect(chartX, y, chartW, chartH, 'F');

  // Border
  pdf.setDrawColor(200, 200, 210);
  pdf.setLineWidth(0.2);
  pdf.rect(chartX, y, chartW, chartH, 'S');

  // Horizontal grid lines (3 lines)
  pdf.setDrawColor(220, 220, 230);
  pdf.setLineWidth(0.1);
  for (let i = 1; i <= 3; i++) {
    const gy = y + (chartH * i) / 4;
    pdf.line(chartX, gy, chartX + chartW, gy);
  }

  // Y-axis labels
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(120, 120, 130);
  for (let i = 0; i <= 4; i++) {
    const val = paddedMax - (yRange * i) / 4;
    const ly = y + (chartH * i) / 4;
    pdf.text(`${Math.round(val)}`, x, ly + 2);
  }

  // Map dates to x positions
  const firstDate = new Date(points[0].date + 'T12:00:00').getTime();
  const lastDate = new Date(points[points.length - 1].date + 'T12:00:00').getTime();
  const dateRange = lastDate - firstDate || 1;

  const toX = (dateStr: string) => {
    const t = new Date(dateStr + 'T12:00:00').getTime();
    const ratio = points.length === 1 ? 0.5 : (t - firstDate) / dateRange;
    return chartX + 4 + ratio * (chartW - 8);
  };
  const toY = (orm: number) => {
    const ratio = (orm - paddedMin) / yRange;
    return y + chartH - ratio * chartH;
  };

  // Draw line
  if (points.length > 1) {
    pdf.setDrawColor(99, 102, 241);
    pdf.setLineWidth(0.6);
    for (let i = 0; i < points.length - 1; i++) {
      const x1 = toX(points[i].date);
      const y1 = toY(points[i].orm);
      const x2 = toX(points[i + 1].date);
      const y2 = toY(points[i + 1].orm);
      pdf.line(x1, y1, x2, y2);
    }
  }

  // Draw dots
  pdf.setFillColor(99, 102, 241);
  points.forEach((p) => {
    const px = toX(p.date);
    const py = toY(p.orm);
    pdf.circle(px, py, 1.2, 'F');
  });

  // X-axis date labels
  pdf.setFontSize(6.5);
  pdf.setTextColor(120, 120, 130);
  const maxLabels = Math.min(points.length, 6);
  const step = Math.max(1, Math.floor(points.length / maxLabels));
  for (let i = 0; i < points.length; i += step) {
    const px = toX(points[i].date);
    const label = formatDateShort(points[i].date);
    pdf.text(label, px - 5, y + chartH + 6);
  }
  // Always show last point label
  if (points.length > 1) {
    const last = points[points.length - 1];
    const px = toX(last.date);
    pdf.text(formatDateShort(last.date), px - 5, y + chartH + 6);
  }

  // Reset text color
  pdf.setTextColor(0, 0, 0);
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}
