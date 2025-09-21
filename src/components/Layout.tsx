import { ReactNode } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAppStore, useWorkoutStore } from '@/core/storage/app-store';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { bluetooth, activeWorkout } = useAppStore();
  const { isActive: workoutActive } = useWorkoutStore();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/', label: 'Home', icon: '🏠' },
    { path: '/connect', label: 'Connect', icon: '📡' },
    { path: '/workout', label: 'Workout', icon: '💪' },
    { path: '/planning', label: 'Planning', icon: '📋' },
    { path: '/history', label: 'History', icon: '📊' }
  ];

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header - Fixed to top */}
      <header className="bg-white shadow-sm border-b border-gray-200 flex-shrink-0 sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">
              OpenSweat
            </h1>

            {/* Connection Status */}
            <div className="flex items-center space-x-2">
              {bluetooth.isConnected ? (
                <div className="flex items-center space-x-1 text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs font-medium">Connected</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1 text-gray-400">
                  <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                  <span className="text-xs">Not connected</span>
                </div>
              )}
            </div>
          </div>

          {/* Active Workout Banner */}
          {(activeWorkout || workoutActive) && (
            <div className="mt-2 p-2 bg-blue-100 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-800">
                  Workout in progress
                </span>
                <Link
                  to="/workout"
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  View →
                </Link>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content - Scrollable */}
      <main className="flex-1 max-w-md mx-auto w-full px-4 py-6 overflow-y-auto">
        {children}
      </main>

      {/* Bottom Navigation - Fixed to bottom */}
      <nav className="bg-white border-t border-gray-200 flex-shrink-0 sticky bottom-0 z-40">
        <div className="max-w-md mx-auto px-4">
          <div className="flex justify-around py-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
                  isActive(item.path)
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="text-lg mb-1">{item.icon}</span>
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
}