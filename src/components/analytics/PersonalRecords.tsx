import { useState, useEffect } from 'react';
import { PersonalRecord } from '@/types';
import { performanceAnalytics } from '@/core/analytics/performance-analytics';

export default function PersonalRecords() {
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [recentAchievements, setRecentAchievements] = useState<PersonalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      const [allRecords, recent] = await Promise.all([
        performanceAnalytics.getPersonalRecords(),
        performanceAnalytics.getRecentAchievements(30)
      ]);

      setRecords(allRecords);
      setRecentAchievements(recent);
    } catch (error) {
      console.error('Failed to load personal records:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatMetricValue = (metricType: string, value: number): string => {
    switch (metricType) {
      case 'power':
        return `${Math.round(value)}W`;
      case 'cadence':
        return `${Math.round(value)} rpm`;
      case 'speed':
        return `${value.toFixed(1)} km/h`;
      case 'heartRate':
        return `${Math.round(value)} bpm`;
      case 'distance':
        return `${(value / 1000).toFixed(1)} km`;
      case 'calories':
        return `${Math.round(value)} kcal`;
      default:
        return Math.round(value).toString();
    }
  };

  const getMetricIcon = (metricType: string): string => {
    const icons = {
      power: '⚡',
      cadence: '🔄',
      speed: '🚴',
      heartRate: '❤️',
      distance: '📏',
      calories: '🔥'
    };
    return icons[metricType as keyof typeof icons] || '🏆';
  };

  const getMetricLabel = (metricType: string): string => {
    const labels = {
      power: 'Max Power',
      cadence: 'Max Cadence',
      speed: 'Max Speed',
      heartRate: 'Max Heart Rate',
      distance: 'Longest Distance',
      calories: 'Most Calories'
    };
    return labels[metricType as keyof typeof labels] || metricType;
  };

  const groupedRecords = records.reduce((groups, record) => {
    if (!groups[record.metricType]) {
      groups[record.metricType] = [];
    }
    groups[record.metricType].push(record);
    return groups;
  }, {} as Record<string, PersonalRecord[]>);

  // Get the best record for each metric type
  const bestRecords = Object.entries(groupedRecords).map(([metricType, typeRecords]) => {
    const best = typeRecords.reduce((best, current) =>
      current.value > best.value ? current : best
    );
    return { ...best, metricType };
  });

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Records */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Records</h3>

        {bestRecords.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {bestRecords.map((record) => (
              <div
                key={record.metricType}
                className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">{getMetricIcon(record.metricType)}</div>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {getMetricLabel(record.metricType)}
                    </h4>
                    <p className="text-sm text-gray-600">
                      Set on {new Date(record.achievedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-orange-600">
                    {formatMetricValue(record.metricType, record.value)}
                  </div>
                  <div className="text-xs text-gray-500">Personal Best</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">🏆</div>
            <p>No personal records yet</p>
            <p className="text-sm mt-1">Complete workouts to start tracking your achievements</p>
          </div>
        )}
      </div>

      {/* Recent Achievements */}
      {recentAchievements.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Achievements
            <span className="text-sm font-normal text-gray-500 ml-2">
              (Last 30 days)
            </span>
          </h3>

          <div className="space-y-3">
            {recentAchievements.slice(0, 5).map((achievement) => (
              <div
                key={achievement.id}
                className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="text-lg">{getMetricIcon(achievement.metricType)}</div>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      New {getMetricLabel(achievement.metricType)}!
                    </h4>
                    <p className="text-sm text-gray-600">
                      {new Date(achievement.achievedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-lg font-bold text-green-600">
                  {formatMetricValue(achievement.metricType, achievement.value)}
                </div>
              </div>
            ))}
          </div>

          {recentAchievements.length > 5 && (
            <div className="text-center mt-4">
              <p className="text-sm text-gray-500">
                +{recentAchievements.length - 5} more achievements this month
              </p>
            </div>
          )}
        </div>
      )}

      {/* Progress Insights */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Progress Insights</h3>

        <div className="grid grid-cols-1 gap-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-lg">💡</span>
              <h4 className="font-medium text-blue-900">Training Tip</h4>
            </div>
            <p className="text-sm text-blue-800">
              {bestRecords.some(r => r.metricType === 'power') ? (
                `Your max power is ${formatMetricValue('power', bestRecords.find(r => r.metricType === 'power')?.value || 0)}. Try interval training to improve your power output!`
              ) : (
                'Complete more workouts to unlock personalized training insights based on your performance data.'
              )}
            </p>
          </div>

          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-lg">🎯</span>
              <h4 className="font-medium text-purple-900">Next Goal</h4>
            </div>
            <p className="text-sm text-purple-800">
              {bestRecords.length > 0 ? (
                `Focus on beating your ${getMetricLabel(bestRecords[0].metricType).toLowerCase()} record!`
              ) : (
                'Set your first personal record by completing a workout session.'
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}