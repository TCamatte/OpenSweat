import { useWorkoutStore } from '@/core/storage/app-store';

export default function WorkoutAverages() {
  const { averageMetrics, isActive } = useWorkoutStore();

  if (!isActive || Object.keys(averageMetrics).length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <div className="text-sm font-medium text-gray-700 mb-3">Session Average</div>
      <div className="grid grid-cols-2 gap-6 text-center">
        <div className="flex items-center justify-center space-x-2">
          <span className="text-xl">🔄</span>
          <span className="text-lg font-bold">{(averageMetrics.cadence || 0).toFixed(0)}</span>
          <span className="text-sm text-gray-500">rpm</span>
        </div>
        <div className="flex items-center justify-center space-x-2">
          <span className="text-xl">⚡</span>
          <span className="text-lg font-bold">{(averageMetrics.power || 0).toFixed(0)}</span>
          <span className="text-sm text-gray-500">W</span>
        </div>
      </div>
    </div>
  );
}