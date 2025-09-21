import { Link } from 'react-router-dom';
import { useAppStore } from '@/core/storage/app-store';

export default function HomePage() {
  const { bluetooth, recentSessions, activeWorkout } = useAppStore();

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome Back!
        </h2>
        <p className="text-gray-600">
          Ready for your next workout session?
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link
          to="/connect"
          className={`p-4 rounded-xl border-2 transition-colors ${
            bluetooth.isConnected
              ? 'border-green-200 bg-green-50'
              : 'border-gray-200 bg-white hover:border-blue-200'
          }`}
        >
          <div className="text-center">
            <div className="text-2xl mb-2">
              {bluetooth.isConnected ? '✅' : '📡'}
            </div>
            <h3 className="font-semibold text-gray-900">
              {bluetooth.isConnected ? 'Connected' : 'Connect'}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {bluetooth.isConnected
                ? bluetooth.deviceName || 'Equipment connected'
                : 'Connect your equipment'
              }
            </p>
          </div>
        </Link>

        <Link
          to="/workout"
          className="p-4 rounded-xl border-2 border-gray-200 bg-white hover:border-blue-200 transition-colors"
        >
          <div className="text-center">
            <div className="text-2xl mb-2">💪</div>
            <h3 className="font-semibold text-gray-900">Start Workout</h3>
            <p className="text-sm text-gray-600 mt-1">
              Begin training session
            </p>
          </div>
        </Link>
      </div>

      {/* Planning Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-blue-900">Plan Your Workouts</h3>
            <p className="text-sm text-blue-700 mt-1">
              Create custom workouts offline - no equipment needed
            </p>
          </div>
          <Link
            to="/planning"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Plan
          </Link>
        </div>
      </div>

      {/* Active Workout */}
      {activeWorkout && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-900">
                Workout in Progress
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                Started {new Date(activeWorkout.startTime).toLocaleTimeString()}
              </p>
            </div>
            <Link
              to="/workout"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Resume
            </Link>
          </div>
        </div>
      )}

      {/* Recent Sessions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Recent Sessions
          </h3>
          <Link
            to="/history"
            className="text-blue-600 text-sm hover:text-blue-800"
          >
            View all →
          </Link>
        </div>

        {recentSessions.length > 0 ? (
          <div className="space-y-3">
            {recentSessions.slice(0, 3).map((session) => (
              <div
                key={session.id}
                className="bg-white border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {session.workoutName}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {new Date(session.startTime).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {Math.round((session.summary?.totalDuration || 0) / 60000)}m
                    </p>
                    <p className="text-xs text-gray-600">
                      {session.summary?.estimatedCalories || 0} cal
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📊</div>
            <p>No workout sessions yet</p>
            <p className="text-sm mt-1">
              Start your first workout to see your progress here
            </p>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Quick Stats</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-blue-600">
              {recentSessions.length}
            </p>
            <p className="text-xs text-gray-600">Total Sessions</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">
              {Math.round(
                recentSessions.reduce(
                  (total, session) => total + (session.summary?.totalDuration || 0),
                  0
                ) / 60000
              )}
            </p>
            <p className="text-xs text-gray-600">Total Minutes</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-orange-600">
              {recentSessions.reduce(
                (total, session) => total + (session.summary?.estimatedCalories || 0),
                0
              )}
            </p>
            <p className="text-xs text-gray-600">Total Calories</p>
          </div>
        </div>
      </div>
    </div>
  );
}