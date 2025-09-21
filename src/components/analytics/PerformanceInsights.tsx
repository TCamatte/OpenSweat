import { useState, useEffect } from 'react';
import { performanceAnalytics, PerformanceStats, TrendData, WeeklyProgress, PowerZone } from '@/core/analytics/performance-analytics';
import PerformanceChart from './PerformanceChart';

export default function PerformanceInsights() {
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [powerTrend, setPowerTrend] = useState<TrendData | null>(null);
  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyProgress[]>([]);
  const [powerZones, setPowerZones] = useState<PowerZone[]>([]);
  const [trainingLoad, setTrainingLoad] = useState<{ acute: number; chronic: number; ratio: number } | null>(null);
  const [timeRange, setTimeRange] = useState<'30' | '90' | '365'>('30');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInsights();
  }, [timeRange]);

  const loadInsights = async () => {
    try {
      setLoading(true);

      const days = parseInt(timeRange);
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));

      const [
        overallStats,
        trend,
        weekly,
        zones,
        load
      ] = await Promise.all([
        performanceAnalytics.getOverallStats({ start: startDate, end: endDate }),
        performanceAnalytics.getPowerTrend(days),
        performanceAnalytics.getWeeklyProgress(Math.ceil(days / 7)),
        performanceAnalytics.getPowerZones(),
        performanceAnalytics.getTrainingLoad()
      ]);

      setStats(overallStats);
      setPowerTrend(trend);
      setWeeklyProgress(weekly);
      setPowerZones(zones);
      setTrainingLoad(load);
    } catch (error) {
      console.error('Failed to load performance insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (ms: number): string => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };


  const getTrendIcon = (trend: 'up' | 'down' | 'stable'): string => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      default: return '➡️';
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable'): string => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getTrainingLoadColor = (ratio: number): string => {
    if (ratio < 0.8) return 'text-blue-600'; // Fresh
    if (ratio <= 1.3) return 'text-green-600'; // Optimal
    if (ratio <= 1.5) return 'text-yellow-600'; // Functional overreaching
    return 'text-red-600'; // Non-functional overreaching
  };

  const getTrainingLoadStatus = (ratio: number): string => {
    if (ratio < 0.8) return 'Fresh - Ready for hard training';
    if (ratio <= 1.3) return 'Optimal - Good training balance';
    if (ratio <= 1.5) return 'Fatigued - Consider easier sessions';
    return 'Overtrained - Rest recommended';
  };

  const getPowerChartData = () => {
    if (!powerTrend) return [];
    return powerTrend.dates.map((date, index) => ({
      x: date,
      y: powerTrend.values[index]
    }));
  };

  const getWeeklyChartData = () => {
    return weeklyProgress.map(week => ({
      x: week.week,
      y: week.sessions
    }));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-24 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Performance Insights</h2>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="30">Last 30 Days</option>
            <option value="90">Last 3 Months</option>
            <option value="365">Last Year</option>
          </select>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Statistics</h3>

        {stats && stats.totalSessions > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.totalSessions}</div>
              <div className="text-sm text-blue-800">Total Sessions</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {formatDuration(stats.totalDuration)}
              </div>
              <div className="text-sm text-green-800">Total Time</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {Math.round(stats.totalCalories).toLocaleString()}
              </div>
              <div className="text-sm text-orange-800">Calories Burned</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(stats.averagePower)}W
              </div>
              <div className="text-sm text-purple-800">Avg Power</div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📊</div>
            <p>No workout data available</p>
            <p className="text-sm mt-1">Complete some workouts to see your performance insights</p>
          </div>
        )}
      </div>

      {/* Power Trend */}
      {powerTrend && powerTrend.values.some(v => v > 0) && (
        <div className="space-y-4">
          <PerformanceChart
            data={getPowerChartData()}
            title="Power Trend"
            yAxisLabel="Average Power (W)"
            color="#3b82f6"
            height={200}
            showTrend={true}
          />

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Power Trend Analysis</h4>
                <p className="text-sm text-gray-600">Comparing recent 7 days to previous 7 days</p>
              </div>
              <div className="text-right">
                <div className={`flex items-center space-x-2 ${getTrendColor(powerTrend.trend)}`}>
                  <span className="text-xl">{getTrendIcon(powerTrend.trend)}</span>
                  <span className="font-medium">
                    {Math.abs(powerTrend.changePercent).toFixed(1)}%
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {powerTrend.trend === 'up' ? 'Improving' :
                   powerTrend.trend === 'down' ? 'Declining' : 'Stable'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Progress */}
      {weeklyProgress.length > 0 && (
        <PerformanceChart
          data={getWeeklyChartData()}
          title="Weekly Sessions"
          yAxisLabel="Sessions per Week"
          color="#10b981"
          height={200}
        />
      )}

      {/* Training Load */}
      {trainingLoad && trainingLoad.chronic > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Training Load</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-xl font-bold text-blue-600">
                {Math.round(trainingLoad.acute)}
              </div>
              <div className="text-sm text-blue-800">Acute Load (7d)</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-xl font-bold text-green-600">
                {Math.round(trainingLoad.chronic)}
              </div>
              <div className="text-sm text-green-800">Chronic Load (28d)</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className={`text-xl font-bold ${getTrainingLoadColor(trainingLoad.ratio)}`}>
                {trainingLoad.ratio.toFixed(2)}
              </div>
              <div className="text-sm text-gray-800">A:C Ratio</div>
            </div>
          </div>

          <div className={`p-4 rounded-lg border-l-4 ${
            trainingLoad.ratio <= 1.3 ? 'bg-green-50 border-green-400' :
            trainingLoad.ratio <= 1.5 ? 'bg-yellow-50 border-yellow-400' :
            'bg-red-50 border-red-400'
          }`}>
            <div className="flex items-center space-x-2">
              <span className="text-lg">
                {trainingLoad.ratio <= 1.3 ? '✅' :
                 trainingLoad.ratio <= 1.5 ? '⚠️' : '🚨'}
              </span>
              <div>
                <p className="font-medium text-gray-900">
                  {getTrainingLoadStatus(trainingLoad.ratio)}
                </p>
                <p className="text-sm text-gray-600">
                  Your current training load balance indicates your recovery status
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Power Zones */}
      {powerZones.some(zone => zone.timeInZone > 0) && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Power Zone Distribution</h3>

          <div className="space-y-3">
            {powerZones.map((zone) => (
              <div key={zone.zone} className="flex items-center space-x-4">
                <div className="w-16 text-sm font-medium text-gray-700">
                  Zone {zone.zone}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{zone.name}</span>
                    <span className="text-sm text-gray-600">
                      {zone.percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-blue-400 to-purple-600"
                      style={{ width: `${Math.min(zone.percentage, 100)}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {zone.minPower}W - {zone.maxPower === 9999 ? '∞' : `${zone.maxPower}W`}
                    {zone.timeInZone > 0 && (
                      <span className="ml-2">
                        ({Math.round(zone.timeInZone / 60)} min)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 <strong>Tip:</strong> Balanced training across zones improves overall fitness.
              Zone 2 (Endurance) should make up 70-80% of your training volume.
            </p>
          </div>
        </div>
      )}

      {/* Performance Recommendations */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommendations</h3>

        <div className="space-y-4">
          {stats && stats.totalSessions > 0 ? (
            <>
              {stats.averagePower > 0 && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <span className="text-xl">🎯</span>
                    <div>
                      <h4 className="font-medium text-blue-900">Power Focus</h4>
                      <p className="text-sm text-blue-800">
                        Your average power is {Math.round(stats.averagePower)}W.
                        Try interval training to increase your peak power output.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {stats.totalSessions < 10 && (
                <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <span className="text-xl">📅</span>
                    <div>
                      <h4 className="font-medium text-green-900">Consistency</h4>
                      <p className="text-sm text-green-800">
                        You've completed {stats.totalSessions} sessions.
                        Aim for 3-4 sessions per week to build fitness consistently.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {powerTrend && powerTrend.trend === 'down' && (
                <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <span className="text-xl">📉</span>
                    <div>
                      <h4 className="font-medium text-yellow-900">Performance Trend</h4>
                      <p className="text-sm text-yellow-800">
                        Your power has decreased by {Math.abs(powerTrend.changePercent).toFixed(1)}% recently.
                        Consider reviewing your training intensity and recovery.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 border border-gray-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <span className="text-xl">🚀</span>
                <div>
                  <h4 className="font-medium text-gray-900">Get Started</h4>
                  <p className="text-sm text-gray-800">
                    Complete your first workout to start tracking your performance insights and see personalized recommendations.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}