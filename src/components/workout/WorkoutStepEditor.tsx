import { useState } from 'react';
import { WorkoutStep, WorkoutStepType } from '@/types';

interface WorkoutStepEditorProps {
  step?: WorkoutStep;
  onSave: (step: WorkoutStep) => void;
  onCancel: () => void;
  stepNumber: number;
}

export default function WorkoutStepEditor({
  step,
  onSave,
  onCancel,
  stepNumber
}: WorkoutStepEditorProps) {
  const [formData, setFormData] = useState<Partial<WorkoutStep>>({
    id: step?.id || `step_${Date.now()}`,
    duration: step?.duration || 60, // 5 minutes default
    type: step?.type || 'steady',
    targetMetrics: {
      resistance: step?.targetMetrics?.resistance || 50,
      cadence: step?.targetMetrics?.cadence || 80,
      power: step?.targetMetrics?.power || 150,
      heartRate: step?.targetMetrics?.heartRate || 140,
      ...step?.targetMetrics
    }
  });

  const stepTypes: { value: WorkoutStepType; label: string; color: string; icon: string }[] = [
    { value: 'warmup', label: 'Warm Up', color: 'bg-green-100 text-green-800', icon: '🔥' },
    { value: 'steady', label: 'Steady', color: 'bg-blue-100 text-blue-800', icon: '➡️' },
    { value: 'interval', label: 'Interval', color: 'bg-red-100 text-red-800', icon: '⚡' },
    { value: 'recovery', label: 'Recovery', color: 'bg-yellow-100 text-yellow-800', icon: '😌' },
    { value: 'cooldown', label: 'Cool Down', color: 'bg-purple-100 text-purple-800', icon: '❄️' }
  ];

  const handleSave = () => {
    if (!formData.duration || formData.duration <= 0) {
      alert('Please enter a valid duration');
      return;
    }

    const stepToSave: WorkoutStep = {
      id: formData.id!,
      duration: formData.duration,
      type: formData.type!,
      name: `Step ${stepNumber}`,
      description: '',
      targetMetrics: formData.targetMetrics || {}
    };

    onSave(stepToSave);
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };



  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {step ? 'Edit Step' : 'Add Step'} #{stepNumber}
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="space-y-6">
            {/* Step Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Step Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {stepTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setFormData({ ...formData, type: type.value })}
                    className={`p-3 rounded-lg border-2 text-center transition-all ${
                      formData.type === type.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="text-xl">{type.icon}</div>
                      <div className="text-xs font-medium text-gray-900">{type.label}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration
              </label>
              <div className="flex space-x-2 items-center">
                <div className="flex-1">
                  <input
                    type="number"
                    value={Math.floor((formData.duration || 0) / 60)}
                    onChange={(e) => {
                      const minutes = parseInt(e.target.value) || 0;
                      const seconds = (formData.duration || 0) % 60;
                      setFormData({
                        ...formData,
                        duration: minutes * 60 + seconds
                      });
                    }}
                    min="0"
                    max="180"
                    placeholder="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                  />
                  <div className="text-xs text-gray-500 text-center mt-1">minutes</div>
                </div>
                <div className="text-gray-400">:</div>
                <div className="flex-1">
                  <input
                    type="number"
                    value={(formData.duration || 0) % 60}
                    onChange={(e) => {
                      const seconds = parseInt(e.target.value) || 0;
                      const minutes = Math.floor((formData.duration || 0) / 60);
                      setFormData({
                        ...formData,
                        duration: minutes * 60 + Math.min(59, Math.max(0, seconds))
                      });
                    }}
                    min="0"
                    max="59"
                    placeholder="00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                  />
                  <div className="text-xs text-gray-500 text-center mt-1">seconds</div>
                </div>
              </div>
              <div className="text-sm text-gray-500 mt-1 text-center">
                Total: {formatDuration(formData.duration || 0)}
              </div>
            </div>

            {/* Target Metrics */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Target Metrics
              </label>
              <div className="space-y-4">
                {/* Resistance */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Resistance</span>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        value={formData.targetMetrics?.resistance || 0}
                        onChange={(e) => {
                          const value = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                          setFormData({
                            ...formData,
                            targetMetrics: {
                              ...formData.targetMetrics,
                              resistance: value
                            }
                          });
                        }}
                        min="0"
                        max="100"
                        className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-center"
                      />
                      <span className="text-sm text-gray-500">%</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formData.targetMetrics?.resistance || 0}
                    onChange={(e) => setFormData({
                      ...formData,
                      targetMetrics: {
                        ...formData.targetMetrics,
                        resistance: parseInt(e.target.value)
                      }
                    })}
                    className="w-full"
                  />
                </div>

                {/* Cadence */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Target Cadence</span>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        value={formData.targetMetrics?.cadence || 80}
                        onChange={(e) => {
                          const value = Math.min(120, Math.max(40, parseInt(e.target.value) || 80));
                          setFormData({
                            ...formData,
                            targetMetrics: {
                              ...formData.targetMetrics,
                              cadence: value
                            }
                          });
                        }}
                        min="40"
                        max="120"
                        className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-center"
                      />
                      <span className="text-sm text-gray-500">rpm</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="40"
                    max="120"
                    value={formData.targetMetrics?.cadence || 80}
                    onChange={(e) => setFormData({
                      ...formData,
                      targetMetrics: {
                        ...formData.targetMetrics,
                        cadence: parseInt(e.target.value)
                      }
                    })}
                    className="w-full"
                  />
                </div>

                {/* Power */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Target Power</span>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        value={formData.targetMetrics?.power || 150}
                        onChange={(e) => {
                          const value = Math.min(400, Math.max(50, parseInt(e.target.value) || 150));
                          setFormData({
                            ...formData,
                            targetMetrics: {
                              ...formData.targetMetrics,
                              power: value
                            }
                          });
                        }}
                        min="50"
                        max="400"
                        className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-center"
                      />
                      <span className="text-sm text-gray-500">W</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="400"
                    value={formData.targetMetrics?.power || 150}
                    onChange={(e) => setFormData({
                      ...formData,
                      targetMetrics: {
                        ...formData.targetMetrics,
                        power: parseInt(e.target.value)
                      }
                    })}
                    className="w-full"
                  />
                </div>
              </div>
            </div>


            {/* Actions */}
            <div className="flex space-x-3 pt-4">
              <button
                onClick={onCancel}
                className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {step ? 'Update' : 'Add'} Step
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}