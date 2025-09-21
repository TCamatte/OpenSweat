interface MetricCardProps {
  title: string;
  value: number | string;
  unit: string;
  icon: string;
  trend?: 'up' | 'down' | 'stable';
  target?: number;
  className?: string;
}

export default function MetricCard({
  title,
  value,
  unit,
  icon,
  trend,
  target,
  className = ''
}: MetricCardProps) {
  const numericValue = typeof value === 'number' ? value : parseFloat(value.toString()) || 0;
  const targetProgress = target ? Math.min((numericValue / target) * 100, 100) : 0;

  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    stable: 'text-gray-600'
  };

  const trendIcons = {
    up: '↗',
    down: '↘',
    stable: '→'
  };

  return (
    <div className={`bg-white rounded-xl p-4 shadow-sm border border-gray-200 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{icon}</span>
          <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        </div>
        {trend && (
          <span className={`text-sm ${trendColors[trend]}`}>
            {trendIcons[trend]}
          </span>
        )}
      </div>

      <div className="flex items-baseline space-x-1">
        <span className="text-2xl font-bold text-gray-900">
          {typeof value === 'number' ? value.toFixed(0) : value}
        </span>
        <span className="text-sm text-gray-500">{unit}</span>
      </div>

      {target && (
        <div className="mt-3">
          <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
            <span>Target: {target} {unit}</span>
            <span>{targetProgress.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${targetProgress}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
}