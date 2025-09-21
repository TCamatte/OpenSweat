import { useState } from 'react';
import { deviceManager } from '@/core/bluetooth/device-manager';

interface ResistanceControlProps {
  currentResistance?: number;
  onResistanceChange?: (level: number) => void;
  disabled?: boolean;
}

export default function ResistanceControl({
  currentResistance = 0,
  onResistanceChange,
  disabled = false
}: ResistanceControlProps) {
  const [targetResistance, setTargetResistance] = useState(currentResistance);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResistanceChange = async (newLevel: number) => {
    if (disabled || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      await deviceManager.setResistance(newLevel);
      setTargetResistance(newLevel);

      if (onResistanceChange) {
        onResistanceChange(newLevel);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to set resistance';
      setError(errorMessage);
      console.error('Resistance control error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLevel = parseInt(event.target.value);
    handleResistanceChange(newLevel);
  };

  const handlePresetClick = (level: number) => {
    handleResistanceChange(level);
  };

  const presetLevels = [10, 25, 50, 75, 90];

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Resistance Control</h3>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">{targetResistance}%</div>
          {currentResistance !== targetResistance && (
            <div className="text-sm text-gray-500">
              Current: {currentResistance}%
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Slider Control */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">Resistance Level</span>
          <span className="text-sm text-gray-600">0% - 100%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={targetResistance}
          onChange={handleSliderChange}
          disabled={disabled || isLoading}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${targetResistance}%, #e5e7eb ${targetResistance}%, #e5e7eb 100%)`
          }}
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Easy</span>
          <span>Moderate</span>
          <span>Hard</span>
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700">Quick Presets</h4>
        <div className="grid grid-cols-5 gap-2">
          {presetLevels.map((level) => (
            <button
              key={level}
              onClick={() => handlePresetClick(level)}
              disabled={disabled || isLoading}
              className={`py-2 px-3 text-sm font-medium rounded-lg transition-colors ${
                targetResistance === level
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {level}%
            </button>
          ))}
        </div>
      </div>

      {/* Fine Control */}
      <div className="mt-6 flex items-center justify-center space-x-4">
        <button
          onClick={() => handleResistanceChange(Math.max(0, targetResistance - 5))}
          disabled={disabled || isLoading || targetResistance <= 0}
          className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-full hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span className="text-lg">−</span>
        </button>

        <div className="text-center">
          <div className="text-sm text-gray-600">Fine Adjust</div>
          <div className="text-xs text-gray-500">±5%</div>
        </div>

        <button
          onClick={() => handleResistanceChange(Math.min(100, targetResistance + 5))}
          disabled={disabled || isLoading || targetResistance >= 100}
          className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-full hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span className="text-lg">+</span>
        </button>
      </div>

      {isLoading && (
        <div className="mt-4 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
          <span className="text-sm text-gray-600">Adjusting resistance...</span>
        </div>
      )}

      {/* Device Status */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Equipment Status</span>
          <span className={`flex items-center space-x-1 ${
            deviceManager.isConnected() ? 'text-green-600' : 'text-gray-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              deviceManager.isConnected() ? 'bg-green-500' : 'bg-gray-300'
            }`}></div>
            <span>{deviceManager.isConnected() ? 'Connected' : 'Disconnected'}</span>
          </span>
        </div>
      </div>
    </div>
  );
}