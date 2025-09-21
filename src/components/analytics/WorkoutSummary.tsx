import { useState, useEffect } from 'react';
import { performanceAnalytics, PerformanceStats, WeeklyProgress } from '@/core/analytics/performance-analytics';
import { storageManager } from '@/core/storage/local-storage-manager';
import { WorkoutSession } from '@/types';

interface SummaryPeriod {
  label: string;
  value: 'today' | 'week' | 'month' | 'year';
  days: number;
}

const SUMMARY_PERIODS: SummaryPeriod[] = [
  { label: 'Today', value: 'today', days: 1 },
  { label: 'This Week', value: 'week', days: 7 },
  { label: 'This Month', value: 'month', days: 30 },
  { label: 'This Year', value: 'year', days: 365 }
];

export default function WorkoutSummary() {
  const [selectedPeriod, setSelectedPeriod] = useState<SummaryPeriod>(SUMMARY_PERIODS[1]);
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [recentSessions, setRecentSessions] = useState<WorkoutSession[]>([]);
  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSummaryData();
  }, [selectedPeriod]);

  const loadSummaryData = async () => {
    try {
      setLoading(true);

      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (selectedPeriod.days * 24 * 60 * 60 * 1000));

      const [overallStats, sessions, weekly] = await Promise.all([
        performanceAnalytics.getOverallStats({ start: startDate, end: endDate }),
        getRecentSessions(selectedPeriod.days),
        performanceAnalytics.getWeeklyProgress(4) // Last 4 weeks for comparison
      ]);

      setStats(overallStats);
      setRecentSessions(sessions);
      setWeeklyProgress(weekly);
    } catch (error) {
      console.error('Failed to load summary data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRecentSessions = async (days: number): Promise<WorkoutSession[]> => {
    const allSessions = await storageManager.getSessions();
    const cutoffDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));

    return allSessions
      .filter(session => new Date(session.startTime) >= cutoffDate)
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, 10); // Limit to 10 most recent
  };

  const formatDuration = (ms: number): string => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const getWorkoutTypeIcon = (workoutName: string): string => {
    if (!workoutName) return '🚴';

    const name = workoutName.toLowerCase();
    if (name.includes('endurance')) return '🏃';
    if (name.includes('interval')) return '⚡';
    if (name.includes('recovery')) return '🧘';
    if (name.includes('power')) return '💪';

    return '🚴';
  };

  const calculateProgress = (): { current: number; previous: number; change: number } => {
    if (!stats || weeklyProgress.length < 2) {
      return { current: 0, previous: 0, change: 0 };
    }

    const currentWeek = weeklyProgress[weeklyProgress.length - 1];
    const previousWeek = weeklyProgress[weeklyProgress.length - 2];

    const current = currentWeek?.sessions || 0;
    const previous = previousWeek?.sessions || 0;
    const change = previous > 0 ? ((current - previous) / previous) * 100 : 0;

    return { current, previous, change };
  };

  const getStreakData = (): { current: number; longest: number } => {
    if (recentSessions.length === 0) {
      return { current: 0, longest: 0 };
    }

    // Calculate current streak (consecutive days with workouts)
    let currentStreak = 0;
    let longestStreak = 0;
  
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    // Group sessions by date
    const sessionsByDate = new Map<string, WorkoutSession[]>();
    recentSessions.forEach(session => {
      const dateKey = new Date(session.startTime).toDateString();
      if (!sessionsByDate.has(dateKey)) {
        sessionsByDate.set(dateKey, []);
      }
      sessionsByDate.get(dateKey)!.push(session);
    });

    // Check for current streak
    let checkDate = new Date(today);
    while (true) {
      const dateKey = checkDate.toDateString();
      if (sessionsByDate.has(dateKey)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Calculate longest streak from all sessions
    let consecutiveDays = 0;
    const sortedDates = Array.from(sessionsByDate.keys()).sort();

    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0) {
        consecutiveDays = 1;
      } else {
        const currentDate = new Date(sortedDates[i]);
        const previousDate = new Date(sortedDates[i - 1]);
        const diffTime = currentDate.getTime() - previousDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          consecutiveDays++;
        } else {
          longestStreak = Math.max(longestStreak, consecutiveDays);
          consecutiveDays = 1;
        }
      }
    }
    longestStreak = Math.max(longestStreak, consecutiveDays);

    return { current: currentStreak, longest: longestStreak };
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const progress = calculateProgress();
  const streak = getStreakData();

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Workout Summary</h2>

        <div className="flex flex-wrap gap-2">
          {SUMMARY_PERIODS.map((period) => (
            <button
              key={period.value}
              onClick={() => setSelectedPeriod(period)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedPeriod.value === period.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {selectedPeriod.label} Overview
        </h3>

        {stats && stats.totalSessions > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.totalSessions}</div>
              <div className="text-sm text-blue-800">Sessions</div>
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
              <div className="text-sm text-orange-800">Calories</div>
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
            <div className="text-4xl mb-2">🎯</div>
            <p>No workouts completed {selectedPeriod.label.toLowerCase()}</p>
            <p className="text-sm mt-1">Start a workout to see your summary</p>
          </div>
        )}
      </div>

      {/* Progress & Streaks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Weekly Progress */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Progress</h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">This Week</span>
              <span className="text-xl font-bold text-blue-600">{progress.current} sessions</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Last Week</span>
              <span className="text-lg text-gray-700">{progress.previous} sessions</span>
            </div>

            {progress.change !== 0 && (
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="text-sm text-gray-600">Change</span>
                <span className={`text-lg font-medium ${
                  progress.change > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {progress.change > 0 ? '+' : ''}{progress.change.toFixed(0)}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Workout Streaks */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Workout Streaks</h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Current Streak</span>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold text-orange-600">{streak.current}</span>
                <span className="text-sm text-gray-500">
                  day{streak.current !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Longest Streak</span>
              <div className="flex items-center space-x-2">
                <span className="text-lg text-gray-700">{streak.longest}</span>
                <span className="text-sm text-gray-500">
                  day{streak.longest !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {streak.current > 0 && (
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-lg">🔥</span>
                  <span className="text-gray-600">
                    {streak.current === streak.longest
                      ? 'New personal best!'
                      : `Keep going! ${streak.longest - streak.current} more to beat your record`
                    }
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Sessions</h3>
          {recentSessions.length > 0 && (
            <span className="text-sm text-gray-500">
              Last {recentSessions.length} session{recentSessions.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {recentSessions.length > 0 ? (
          <div className="space-y-3">
            {recentSessions.slice(0, 5).map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{getWorkoutTypeIcon(session.workoutName || 'Free Ride')}</span>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {session.workoutName || 'Free Ride'}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {formatDate(session.startTime)} • {formatDuration(session.summary?.totalDuration || 0)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-blue-600">
                    {Math.round(session.summary?.avgMetrics.power || 0)}W
                  </div>
                  <div className="text-xs text-gray-500">
                    {session.summary?.estimatedCalories || 0} kcal
                  </div>
                </div>
              </div>
            ))}

            {recentSessions.length > 5 && (
              <div className="text-center pt-2">
                <span className="text-sm text-gray-500">
                  +{recentSessions.length - 5} more sessions
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">🏃</div>
            <p>No recent sessions</p>
            <p className="text-sm mt-1">Complete a workout to see it here</p>
          </div>
        )}
      </div>

      {/* Goals & Motivation */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Goals & Motivation</h3>

        <div className="space-y-4">
          {stats && stats.totalSessions >= 10 && (
            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <span className="text-xl">🏆</span>
                <div>
                  <h4 className="font-medium text-green-900">Consistency Champion</h4>
                  <p className="text-sm text-green-800">
                    You've completed {stats.totalSessions} sessions! Great job staying consistent.
                  </p>
                </div>
              </div>
            </div>
          )}

          {streak.current >= 3 && (
            <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <span className="text-xl">🔥</span>
                <div>
                  <h4 className="font-medium text-orange-900">On Fire!</h4>
                  <p className="text-sm text-orange-800">
                    {streak.current} day streak! You're building an amazing habit.
                  </p>
                </div>
              </div>
            </div>
          )}

          {stats && stats.totalCalories >= 1000 && (
            <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <span className="text-xl">💪</span>
                <div>
                  <h4 className="font-medium text-purple-900">Calorie Crusher</h4>
                  <p className="text-sm text-purple-800">
                    You've burned {Math.round(stats.totalCalories).toLocaleString()} calories this {selectedPeriod.label.toLowerCase()}!
                  </p>
                </div>
              </div>
            </div>
          )}

          {(!stats || stats.totalSessions === 0) && (
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <span className="text-xl">🎯</span>
                <div>
                  <h4 className="font-medium text-blue-900">Ready to Start?</h4>
                  <p className="text-sm text-blue-800">
                    Begin your fitness journey today! Even a 10-minute session makes a difference.
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