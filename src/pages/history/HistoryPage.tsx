import { useState } from 'react';
import WorkoutSummary from '@/components/analytics/WorkoutSummary';
import WorkoutHistory from '@/components/analytics/WorkoutHistory';
import PerformanceInsights from '@/components/analytics/PerformanceInsights';
import PersonalRecords from '@/components/analytics/PersonalRecords';
import DataExport from '@/components/analytics/DataExport';
import DataManagement from '@/components/analytics/DataManagement';

type TabType = 'summary' | 'history' | 'insights' | 'records' | 'export' | 'manage';

export default function HistoryPage() {
  const [activeTab, setActiveTab] = useState<TabType>('summary');

  const tabs = [
    { id: 'summary' as TabType, label: 'Summary', icon: '📊' },
    { id: 'history' as TabType, label: 'History', icon: '📋' },
    { id: 'insights' as TabType, label: 'Insights', icon: '📈' },
    { id: 'records' as TabType, label: 'Records', icon: '🏆' },
    { id: 'export' as TabType, label: 'Export', icon: '📤' },
    { id: 'manage' as TabType, label: 'Manage', icon: '⚙️' }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'summary':
        return <WorkoutSummary />;
      case 'history':
        return <WorkoutHistory />;
      case 'insights':
        return <PerformanceInsights />;
      case 'records':
        return <PersonalRecords />;
      case 'export':
        return <DataExport />;
      case 'manage':
        return <DataManagement />;
      default:
        return <WorkoutSummary />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Analytics & History
        </h2>
        <p className="text-gray-600">
          Track your progress and analyze your performance
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div>
        {renderContent()}
      </div>
    </div>
  );
}