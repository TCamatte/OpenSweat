import React, { useState, useEffect, useRef } from 'react';
import { storageManager } from '@/core/storage/local-storage-manager';
import { useAppStore } from '@/core/storage/app-store';
import { ExportData, ImportResult } from '@/types';

export default function DataManagement() {
  const [isClearing, setIsClearing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string>('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setImportStatus('Please select a JSON file exported from OpenSweat.');
      setTimeout(() => setImportStatus(''), 3000);
      return;
    }

    setIsImporting(true);
    setImportStatus('Reading file...');
    setImportResult(null);

    try {
      const fileContent = await file.text();
      const data: ExportData = JSON.parse(fileContent);

      // Validate the import data structure
      if (!data.exportInfo?.version && !data.version) {
        throw new Error('Invalid file format. Please select a valid OpenSweat export file.');
      }

      // Ensure required arrays exist
      data.workouts = data.workouts || [];
      data.sessions = data.sessions || [];
      data.equipment = data.equipment || [];
      data.personalRecords = data.personalRecords || [];

      setImportStatus('Importing data...');

      const exportDate = data.exportInfo?.exportedAt || (data.exportedAt ? new Date(data.exportedAt).toISOString() : 'unknown date');
      const displayDate = exportDate === 'unknown date' ? exportDate : new Date(exportDate).toLocaleDateString();

      if (!confirm(`Import data from ${displayDate}? This will add to your existing data.`)) {
        setIsImporting(false);
        setImportStatus('');
        return;
      }

      const result = await storageManager.importData(data);
      setImportResult(result);

      if (result.success) {
        setImportStatus('Import completed successfully!');
        await loadRecentSessions();
        await loadStats();
      } else {
        setImportStatus('Import completed with errors. Check details below.');
      }
    } catch (error) {
      console.error('Import failed:', error);
      setImportStatus(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsImporting(false);
      setTimeout(() => {
        if (!importResult || importResult.success) {
          setImportStatus('');
          setImportResult(null);
        }
      }, 5000);

      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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

      {/* Data Import */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Import Data</h3>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-1">
                <h4 className="font-medium text-blue-900">Import JSON Data</h4>
                <p className="text-sm text-blue-800 mt-1">
                  Import workout data from a JSON file exported from OpenSweat.
                  This will add the imported data to your existing workouts, sessions, and records.
                </p>
              </div>
              <button
                onClick={handleImportClick}
                disabled={isImporting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                {isImporting ? 'Importing...' : 'Select File'}
              </button>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Import Status */}
          {importStatus && (
            <div className={`p-3 rounded-lg ${
              importStatus.includes('failed') || importStatus.includes('error') ? 'bg-red-50 text-red-800' :
              importStatus.includes('completed successfully') ? 'bg-green-50 text-green-800' :
              'bg-blue-50 text-blue-800'
            }`}>
              {importStatus}
            </div>
          )}

          {/* Import Results */}
          {importResult && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Import Results</h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Workouts imported:</span>
                  <span className="font-medium text-green-600">{importResult.imported.workouts}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Sessions imported:</span>
                  <span className="font-medium text-green-600">{importResult.imported.sessions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Equipment imported:</span>
                  <span className="font-medium text-green-600">{importResult.imported.equipment}</span>
                </div>
                {importResult.errors.length > 0 && (
                  <div className="mt-3">
                    <span className="text-red-600 font-medium">Errors ({importResult.errors.length}):</span>
                    <ul className="mt-1 space-y-1">
                      {importResult.errors.slice(0, 5).map((error, index) => (
                        <li key={index} className="text-xs text-red-600 pl-2">• {error}</li>
                      ))}
                      {importResult.errors.length > 5 && (
                        <li className="text-xs text-red-600 pl-2">• ... and {importResult.errors.length - 5} more errors</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Import Instructions */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <span className="text-amber-600">ℹ️</span>
              <div>
                <h4 className="font-medium text-amber-900">Import Guidelines</h4>
                <ul className="text-sm text-amber-800 mt-1 space-y-1">
                  <li>• Only JSON files exported from OpenSweat are supported</li>
                  <li>• Import adds to existing data (does not replace)</li>
                  <li>• Duplicate data may be created if importing the same file multiple times</li>
                  <li>• Large files may take a moment to process</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
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