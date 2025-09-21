import { useState, useEffect } from 'react';
import { WorkoutSession } from '@/types';
import { storageManager } from '@/core/storage/local-storage-manager';
import PerformanceChart from './PerformanceChart';

interface HistoryFilters {
  timeRange: 'week' | 'month' | 'year' | 'all';
  workoutType?: string;
  sortBy: 'date' | 'duration' | 'calories';
  sortOrder: 'asc' | 'desc';
}

export default function WorkoutHistory() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<WorkoutSession[]>([]);
  const [filters, setFilters] = useState<HistoryFilters>({
    timeRange: 'month',
    sortBy: 'date',
    sortOrder: 'desc'
  });
  const [selectedSession, setSelectedSession] = useState<WorkoutSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [sessions, filters]);

  const loadSessions = async () => {
    try {
      const allSessions = await storageManager.getSessions();
      setSessions(allSessions);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...sessions];

    // Time range filter
    const now = new Date();
    let cutoffDate: Date;

    switch (filters.timeRange) {
      case 'week':
        cutoffDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        break;
      case 'month':
        cutoffDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        break;
      case 'year':
        cutoffDate = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000));
        break;
      default:
        cutoffDate = new Date(0);
    }

    filtered = filtered.filter(session => new Date(session.startTime) >= cutoffDate);

    // Workout type filter
    if (filters.workoutType) {
      filtered = filtered.filter(session => session.workoutName?.includes(filters.workoutType!));
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (filters.sortBy) {
        case 'duration':
          aValue = a.summary?.totalDuration || 0;
          bValue = b.summary?.totalDuration || 0;
          break;
        case 'calories':
          aValue = a.summary?.estimatedCalories || 0;
          bValue = b.summary?.estimatedCalories || 0;
          break;
        default:
          aValue = new Date(a.startTime).getTime();
          bValue = new Date(b.startTime).getTime();
      }

      return filters.sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

    setFilteredSessions(filtered);
  };

  const formatDuration = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getWorkoutTypeColor = (workoutName?: string): string => {
    if (!workoutName) return 'bg-gray-100 text-gray-800';

    if (workoutName.toLowerCase().includes('endurance')) return 'bg-blue-100 text-blue-800';
    if (workoutName.toLowerCase().includes('interval')) return 'bg-red-100 text-red-800';
    if (workoutName.toLowerCase().includes('recovery')) return 'bg-green-100 text-green-800';
    if (workoutName.toLowerCase().includes('power')) return 'bg-purple-100 text-purple-800';

    return 'bg-gray-100 text-gray-800';
  };

  const getSessionChartData = (session: WorkoutSession) => {
    return session.dataPoints.map((point, index) => ({
      x: index * 2, // 2-second intervals
      y: point.metrics.power || 0
    }));
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (selectedSession) {
    return (
      <div className="space-y-6">
        {/* Session Detail Header */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setSelectedSession(null)}
              className="flex items-center text-blue-600 hover:text-blue-800"
            >
              ← Back to History
            </button>
            <span className="text-sm text-gray-500">
              {formatDate(selectedSession.startTime)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {selectedSession.workoutName || 'Free Ride'}
              </h2>
              <p className="text-gray-600">
                Duration: {formatDuration(selectedSession.summary?.totalDuration || 0)}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-orange-600">
                {selectedSession.summary?.estimatedCalories || 0} kcal
              </div>
              <p className="text-sm text-gray-500">Calories Burned</p>
            </div>
          </div>

          {/* Session Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-lg font-semibold text-blue-600">
                {Math.round(selectedSession.summary?.avgMetrics['power'] || 0)}W
              </div>
              <div className="text-xs text-blue-800">Avg Power</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-lg font-semibold text-green-600">
                {Math.round(selectedSession.summary?.maxMetrics['power'] || 0)}W
              </div>
              <div className="text-xs text-green-800">Max Power</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-lg font-semibold text-purple-600">
                {Math.round(selectedSession.summary?.avgMetrics['cadence'] || 0)}
              </div>
              <div className="text-xs text-purple-800">Avg RPM</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-lg font-semibold text-red-600">
                {Math.round(selectedSession.summary?.avgMetrics['heartRate'] || 0)}
              </div>
              <div className="text-xs text-red-800">Avg HR</div>
            </div>
          </div>
        </div>

        {/* Power Chart */}
        <PerformanceChart
          data={getSessionChartData(selectedSession)}
          title="Power Output"
          yAxisLabel="Power (W)"
          color="#3b82f6"
          height={250}
          showTrend={true}
        />

        {/* Workout Info */}
        {selectedSession.workoutId && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Workout Information</h3>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Workout plan details would be loaded from the workout ID if available.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Workout History</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time Range
            </label>
            <select
              value={filters.timeRange}
              onChange={(e) => setFilters({ ...filters, timeRange: e.target.value as any })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="year">Last Year</option>
              <option value="all">All Time</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Workout Type
            </label>
            <select
              value={filters.workoutType || ''}
              onChange={(e) => setFilters({ ...filters, workoutType: e.target.value || undefined })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Types</option>
              <option value="Endurance">Endurance</option>
              <option value="Interval">Interval</option>
              <option value="Recovery">Recovery</option>
              <option value="Power">Power</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort By
            </label>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as any })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="date">Date</option>
              <option value="duration">Duration</option>
              <option value="calories">Calories</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Order
            </label>
            <select
              value={filters.sortOrder}
              onChange={(e) => setFilters({ ...filters, sortOrder: e.target.value as any })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Session List */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Sessions ({filteredSessions.length})
          </h3>
        </div>

        {filteredSessions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">🏃</div>
            <p>No workout sessions found</p>
            <p className="text-sm mt-1">Try adjusting your filters or complete some workouts</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSessions.map((session) => (
              <div
                key={session.id}
                onClick={() => setSelectedSession(session)}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-medium text-gray-900">
                        {session.workoutName || 'Free Ride'}
                      </h4>
                      {session.workoutName && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getWorkoutTypeColor(session.workoutName)}`}>
                          planned
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>{formatDate(session.startTime)}</span>
                      <span>{formatDuration(session.summary?.totalDuration || 0)}</span>
                      <span>{session.summary?.estimatedCalories || 0} kcal</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-blue-600">
                      {Math.round(session.summary?.avgMetrics['power'] || 0)}W
                    </div>
                    <div className="text-xs text-gray-500">avg power</div>
                  </div>
                </div>

                {/* Mini metrics bar */}
                <div className="flex items-center space-x-4 mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <span>💪</span>
                    <span>{Math.round(session.summary?.maxMetrics['power'] || 0)}W max</span>
                  </div>
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <span>🔄</span>
                    <span>{Math.round(session.summary?.avgMetrics['cadence'] || 0)} rpm</span>
                  </div>
                  {session.summary?.avgMetrics['heartRate'] && (
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <span>❤️</span>
                      <span>{Math.round(session.summary.avgMetrics['heartRate'])} bpm</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}