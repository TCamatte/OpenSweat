import React, { useState, useEffect } from 'react';
import { storageManager } from '@/core/storage/local-storage-manager';
import { useAppStore } from '@/core/storage/app-store';

export default function DataManagement() {
  const [isClearing, setIsClearing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const { loadRecentSessions } = useAppStore();

  const loadStats = async () => {
    try {
      const dbStats = await storageManager.getDatabaseStats();
      setStats(dbStats);
    } catch (error) {
      console.error('Failed to load database stats:', error);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleClearHistoryData = async () => {
    if (!confirm('Are you sure you want to clear all workout history? This will permanently delete all workout sessions and metrics data. This action cannot be undone.')) {
      return;
    }

    setIsClearing(true);
    try {
      await storageManager.clearHistoryData();
      await loadRecentSessions(); // Refresh the app store
      await loadStats();
      alert('Workout history cleared successfully');
    } catch (error) {
      console.error('Failed to clear history data:', error);
      alert('Failed to clear workout history. Please try again.');
    } finally {
      setIsClearing(false);
    }
  };

  const handleClearAnalyticsData = async () => {
    if (!confirm('Are you sure you want to clear all analytics data? This will permanently delete all workout sessions, metrics, and personal records. This action cannot be undone.')) {
      return;
    }

    setIsClearing(true);
    try {
      await storageManager.clearAnalyticsData();
      await loadRecentSessions(); // Refresh the app store
      await loadStats();
      alert('Analytics data cleared successfully');
    } catch (error) {
      console.error('Failed to clear analytics data:', error);
      alert('Failed to clear analytics data. Please try again.');
    } finally {
      setIsClearing(false);
    }
  };

  const handleClearWorkoutPlans = async () => {
    if (!confirm('Are you sure you want to clear all custom workout plans? This will permanently delete all your created workouts but keep templates. This action cannot be undone.')) {
      return;
    }

    setIsClearing(true);
    try {
      await storageManager.clearWorkoutPlans();
      await loadStats();
      alert('Custom workout plans cleared successfully');
    } catch (error) {
      console.error('Failed to clear workout plans:', error);
      alert('Failed to clear workout plans. Please try again.');
    } finally {
      setIsClearing(false);
    }
  };

  const handleClearAllData = async () => {
    if (!confirm('⚠️ DANGER: Are you sure you want to clear ALL data? This will permanently delete everything including workouts, sessions, equipment, metrics, and personal records. This action cannot be undone.')) {
      return;
    }

    if (!confirm('This is your final warning. ALL DATA WILL BE PERMANENTLY DELETED. Are you absolutely sure?')) {
      return;
    }

    setIsClearing(true);
    try {
      await storageManager.clearAllData();
      await loadRecentSessions(); // Refresh the app store
      await loadStats();
      alert('All data cleared successfully');
    } catch (error) {
      console.error('Failed to clear all data:', error);
      alert('Failed to clear all data. Please try again.');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Database Statistics */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Database Statistics</h3>
        {stats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.sessions}</div>
              <div className="text-sm text-gray-600">Workout Sessions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.workouts}</div>
              <div className="text-sm text-gray-600">Workout Plans</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.equipment}</div>
              <div className="text-sm text-gray-600">Equipment</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.personalRecords}</div>
              <div className="text-sm text-gray-600">Personal Records</div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">Loading statistics...</div>
        )}
        <button
          onClick={loadStats}
          className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Refresh Stats
        </button>
      </div>

      {/* Data Management Actions */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Management</h3>
        <div className="space-y-4">

          {/* Clear History Data */}
          <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Clear Workout History</h4>
              <p className="text-sm text-gray-600">
                Remove all workout sessions and metrics data. Keeps workout plans and personal records.
              </p>
            </div>
            <button
              onClick={handleClearHistoryData}
              disabled={isClearing}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isClearing ? 'Clearing...' : 'Clear History'}
            </button>
          </div>

          {/* Clear Analytics Data */}
          <div className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Clear Analytics Data</h4>
              <p className="text-sm text-gray-600">
                Remove all workout sessions, metrics, and personal records. Keeps workout plans and equipment.
              </p>
            </div>
            <button
              onClick={handleClearAnalyticsData}
              disabled={isClearing}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isClearing ? 'Clearing...' : 'Clear Analytics'}
            </button>
          </div>

          {/* Clear Workout Plans */}
          <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Clear Custom Workout Plans</h4>
              <p className="text-sm text-gray-600">
                Remove all your custom workout plans. Keeps templates, sessions, and other data.
              </p>
            </div>
            <button
              onClick={handleClearWorkoutPlans}
              disabled={isClearing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isClearing ? 'Clearing...' : 'Clear Plans'}
            </button>
          </div>

          {/* Clear All Data */}
          <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
            <div>
              <h4 className="font-medium text-red-900">⚠️ Clear All Data</h4>
              <p className="text-sm text-red-700">
                DANGER: Permanently delete everything including workouts, sessions, equipment, metrics, and records.
              </p>
            </div>
            <button
              onClick={handleClearAllData}
              disabled={isClearing}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isClearing ? 'Clearing...' : 'Clear All'}
            </button>
          </div>
        </div>
      </div>

      {/* Warning Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <span className="text-amber-600">⚠️</span>
          <div>
            <h4 className="font-medium text-amber-900">Important Notice</h4>
            <p className="text-sm text-amber-800">
              All clear operations are permanent and cannot be undone. Please make sure to export your data first if you want to keep a backup.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}