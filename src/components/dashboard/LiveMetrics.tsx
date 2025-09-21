import { useEffect, useState } from 'react';
import { FTMSData } from '@/types';
import { deviceManager } from '@/core/bluetooth/device-manager';
import { useWorkoutStore } from '@/core/storage/app-store';
import MetricCard from './MetricCard';

interface LiveMetricsProps {
  isActive?: boolean;
  compact?: boolean;
}

export default function LiveMetrics({ isActive = false, compact = false }: LiveMetricsProps) {
  const [liveData, setLiveData] = useState<FTMSData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { updateMetrics, targetMetrics } = useWorkoutStore();

  useEffect(() => {
    // Check initial connection status
    setIsConnected(deviceManager.isConnected());

    // Set up data listener
    const unsubscribeData = deviceManager.onData((data: FTMSData) => {
      setLiveData(data);

      // Update workout store if active
      if (isActive) {
        const metrics = {
          speed: data.speed || 0,
          cadence: data.cadence || 0,
          power: data.power || 0,
          resistance: data.resistance || 0,
          heartRate: data.heartRate || 0,
          distance: data.distance || 0,
          calories: data.calories || 0
        };
        updateMetrics(metrics);
      }
    });

    // Set up connection listener
    const unsubscribeConnection = deviceManager.onConnectionChange((connected) => {
      setIsConnected(connected);
      if (!connected) {
        setLiveData(null);
      }
    });

    return () => {
      // Note: These would be cleanup functions if implemented
      // unsubscribeData();
      // unsubscribeConnection();
    };
  }, [isActive, updateMetrics]);

  if (!isConnected) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-4">📡</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No Device Connected
        </h3>
        <p className="text-gray-600">
          Connect your Domyos equipment to see live metrics
        </p>
      </div>
    );
  }

  if (!liveData) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-4">⏳</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Waiting for Data
        </h3>
        <p className="text-gray-600">
          Start pedaling to see your metrics
        </p>
      </div>
    );
  }

  const getTrend = (current: number, target?: number): 'up' | 'down' | 'stable' => {
    if (!target) return 'stable';
    if (current > target * 1.05) return 'up';
    if (current < target * 0.95) return 'down';
    return 'stable';
  };

  if (compact) {
    return (
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <div className="text-sm font-medium text-gray-700 mb-3">Live Data</div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="flex items-center justify-center space-x-2">
            <span className="text-xl">🚴</span>
            <span className="text-lg font-bold">{(liveData.speed || 0).toFixed(1)}</span>
            <span className="text-sm text-gray-500">km/h</span>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <span className="text-xl">🔄</span>
            <span className="text-lg font-bold">{(liveData.cadence || 0).toFixed(0)}</span>
            <span className="text-sm text-gray-500">rpm</span>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <span className="text-xl">⚡</span>
            <span className="text-lg font-bold">{(liveData.power || 0).toFixed(0)}</span>
            <span className="text-sm text-gray-500">W</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-center space-x-2">
            <span className="text-xl">🏔️</span>
            <span className="text-lg font-bold">{(liveData.resistance || 0).toFixed(0)}</span>
            <span className="text-sm text-gray-500">%</span>
          </div>
          {liveData.heartRate ? (
            <div className="flex items-center justify-center space-x-2">
              <span className="text-xl">❤️</span>
              <span className="text-lg font-bold">{liveData.heartRate}</span>
              <span className="text-sm text-gray-500">bpm</span>
            </div>
          ) : (
            <div></div>
          )}
          <div className="flex items-center justify-center space-x-2">
            <span className="text-xl">📏</span>
            <span className="text-lg font-bold">{((liveData.distance || 0) / 1000).toFixed(2)}</span>
            <span className="text-sm text-gray-500">km</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Primary Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <MetricCard
          title="Speed"
          value={liveData.speed || 0}
          unit="km/h"
          icon="🚴"
          trend={getTrend(liveData.speed || 0, targetMetrics.speed)}
          target={targetMetrics.speed}
        />
        <MetricCard
          title="Cadence"
          value={liveData.cadence || 0}
          unit="rpm"
          icon="🔄"
          trend={getTrend(liveData.cadence || 0, targetMetrics.cadence)}
          target={targetMetrics.cadence}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <MetricCard
          title="Power"
          value={liveData.power || 0}
          unit="W"
          icon="⚡"
          trend={getTrend(liveData.power || 0, targetMetrics.power)}
          target={targetMetrics.power}
        />
        <MetricCard
          title="Resistance"
          value={liveData.resistance || 0}
          unit="%"
          icon="🏔️"
          trend={getTrend(liveData.resistance || 0, targetMetrics.resistance)}
          target={targetMetrics.resistance}
        />
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-2 gap-4">
        {liveData.heartRate && (
          <MetricCard
            title="Heart Rate"
            value={liveData.heartRate}
            unit="bpm"
            icon="❤️"
          />
        )}
        <MetricCard
          title="Distance"
          value={(liveData.distance || 0) / 1000}
          unit="km"
          icon="📏"
        />
      </div>

      {liveData.calories && (
        <MetricCard
          title="Calories"
          value={liveData.calories}
          unit="kcal"
          icon="🔥"
          className="col-span-2"
        />
      )}

      {/* Data Timestamp */}
      <div className="text-center text-xs text-gray-500 mt-4">
        Last updated: {new Date(liveData.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}