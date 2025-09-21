import { useEffect, useRef } from 'react';

interface DataPoint {
  x: string | number;
  y: number;
}

interface PerformanceChartProps {
  data: DataPoint[];
  title: string;
  yAxisLabel: string;
  color?: string;
  height?: number;
  showTrend?: boolean;
}

export default function PerformanceChart({
  data,
  title,
  yAxisLabel,
  color = '#3b82f6',
  height = 200,
  showTrend = false
}: PerformanceChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, height);

    // Chart dimensions
    const padding = 40;
    const chartWidth = rect.width - (padding * 2);
    const chartHeight = height - (padding * 2);

    // Find min/max values
    const yValues = data.map(d => d.y).filter(y => y > 0);
    if (yValues.length === 0) return;

    const minY = Math.min(...yValues);
    const maxY = Math.max(...yValues);
    const yRange = maxY - minY || 1;

    // Draw axes
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;

    // Y-axis
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.stroke();

    // X-axis
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(rect.width - padding, height - padding);
    ctx.stroke();

    // Draw grid lines
    ctx.strokeStyle = '#f3f4f6';
    ctx.lineWidth = 0.5;

    // Horizontal grid lines
    for (let i = 1; i <= 4; i++) {
      const y = padding + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(rect.width - padding, y);
      ctx.stroke();
    }

    // Plot data points and line
    if (data.length > 1) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      data.forEach((point, index) => {
        if (point.y <= 0) return;

        const x = padding + (chartWidth / (data.length - 1)) * index;
        const y = height - padding - ((point.y - minY) / yRange) * chartHeight;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();

      // Draw data points
      ctx.fillStyle = color;
      data.forEach((point, index) => {
        if (point.y <= 0) return;

        const x = padding + (chartWidth / (data.length - 1)) * index;
        const y = height - padding - ((point.y - minY) / yRange) * chartHeight;

        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw trend line if requested
      if (showTrend && yValues.length > 2) {
        const trend = calculateTrendLine(yValues);
        ctx.strokeStyle = color + '80'; // Semi-transparent
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);

        ctx.beginPath();
        const startY = height - padding - ((trend.start - minY) / yRange) * chartHeight;
        const endY = height - padding - ((trend.end - minY) / yRange) * chartHeight;
        ctx.moveTo(padding, startY);
        ctx.lineTo(rect.width - padding, endY);
        ctx.stroke();

        ctx.setLineDash([]);
      }
    }

    // Draw labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'center';

    // Y-axis labels
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const value = minY + (yRange / 4) * (4 - i);
      const y = padding + (chartHeight / 4) * i;
      ctx.fillText(Math.round(value).toString(), padding - 10, y + 4);
    }

    // X-axis labels (show first, middle, and last)
    ctx.textAlign = 'center';
    if (data.length > 0) {
      // First point
      ctx.fillText(formatXAxisLabel(data[0].x), padding, height - padding + 20);

      // Middle point
      if (data.length > 2) {
        const middleIndex = Math.floor(data.length / 2);
        const x = padding + (chartWidth / (data.length - 1)) * middleIndex;
        ctx.fillText(formatXAxisLabel(data[middleIndex].x), x, height - padding + 20);
      }

      // Last point
      if (data.length > 1) {
        ctx.fillText(
          formatXAxisLabel(data[data.length - 1].x),
          rect.width - padding,
          height - padding + 20
        );
      }
    }

    // Y-axis label
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#374151';
    ctx.font = '14px system-ui';
    ctx.fillText(yAxisLabel, 0, 0);
    ctx.restore();

  }, [data, height, color, yAxisLabel, showTrend]);

  const formatXAxisLabel = (value: string | number): string => {
    if (typeof value === 'string') {
      // Assume it's a date string
      const date = new Date(value);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }
    return value.toString();
  };

  const calculateTrendLine = (values: number[]): { start: number; end: number } => {
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + (val * index), 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return {
      start: intercept,
      end: intercept + slope * (n - 1)
    };
  };

  const isEmpty = data.length === 0 || data.every(d => d.y <= 0);

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      {isEmpty ? (
        <div className="flex items-center justify-center h-48 text-gray-500">
          <div className="text-center">
            <div className="text-3xl mb-2">📈</div>
            <p>No data available</p>
            <p className="text-sm">Complete workouts to see your progress</p>
          </div>
        </div>
      ) : (
        <div className="relative">
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: `${height}px` }}
            className="block"
          />
        </div>
      )}
    </div>
  );
}