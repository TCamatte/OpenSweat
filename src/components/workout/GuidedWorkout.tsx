import { useState, useEffect } from 'react';
import { WorkoutPlan, WorkoutStep } from '@/types';
import { workoutEngine, WorkoutEngineState } from '@/core/workout/workout-engine';
import { deviceManager } from '@/core/bluetooth/device-manager';
import { useAppStore } from '@/core/storage/app-store';
import LiveMetrics from '@/components/dashboard/LiveMetrics';
import WorkoutAverages from '@/components/dashboard/WorkoutAverages';

interface GuidedWorkoutProps {
  workoutPlan: WorkoutPlan;
  onComplete: () => void;
  onCancel: () => void;
}

export default function GuidedWorkout({
  workoutPlan,
  onComplete,
  onCancel
}: GuidedWorkoutProps) {
  const { connectedEquipment } = useAppStore();
  const [engineState, setEngineState] = useState<WorkoutEngineState>(workoutEngine.getState());
  const [stepProgress, setStepProgress] = useState(0);
  const [totalProgress, setTotalProgress] = useState(0);
  const [isStarted, setIsStarted] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [autoControl, setAutoControl] = useState(true);
  const [workoutStarted, setWorkoutStarted] = useState(false);

  useEffect(() => {
    // Set up workout engine callbacks
    const callbacks = {
      onStepChange: (step: WorkoutStep, stepIndex: number) => {
        setEngineState(workoutEngine.getState());
        console.log(`Step changed to: ${step.name || step.type} (${stepIndex + 1})`);
      },
      onWorkoutComplete: () => {
        setEngineState(workoutEngine.getState());
        onComplete();
      },
      onWorkoutPaused: () => {
        setEngineState(workoutEngine.getState());
      },
      onWorkoutResumed: () => {
        setEngineState(workoutEngine.getState());
      },
      onProgress: ({ stepProgress: sp, totalProgress: tp }) => {
        setStepProgress(sp);
        setTotalProgress(tp);
      }
    };

    // Apply callbacks (in a real implementation, this would be done through the constructor or method)
    Object.assign(workoutEngine['callbacks'], callbacks);

    return () => {
      // Cleanup callbacks
      Object.assign(workoutEngine['callbacks'], {});
    };
  }, [onComplete]);

  const handleStart = async () => {
    try {
      // Prevent multiple starts
      if (workoutStarted) return;
      await startGuidedWorkout();
    } catch (error) {
      console.error('Failed to start workout:', error);
      alert('Failed to start workout. Please try again.');
    }
  };

  const startGuidedWorkout = async () => {
    try {
      // Prevent double execution
      if (workoutStarted) return;
      setWorkoutStarted(true);

      // If no equipment is connected, pass null
      console.log("Starting workout");
      await workoutEngine.startWorkout(workoutPlan, connectedEquipment || null, autoControl);
      console.log("Workout started");
      setIsStarted(true);
      setEngineState(workoutEngine.getState());
    } catch (error) {
      console.error('Failed to start workout:', error);
      alert('Failed to start workout. Please try again.');
      setWorkoutStarted(false); // Reset on error
    }
  };

  const handlePause = async () => {
    try {
      await workoutEngine.pauseWorkout();
      setEngineState(workoutEngine.getState());
    } catch (error) {
      console.error('Failed to pause workout:', error);
    }
  };

  const handleResume = async () => {
    try {
      await workoutEngine.resumeWorkout();
      setEngineState(workoutEngine.getState());
    } catch (error) {
      console.error('Failed to resume workout:', error);
    }
  };

  const handleStop = async () => {
    try {
      await workoutEngine.stopWorkout();
      setEngineState(workoutEngine.getState());
      onComplete();
    } catch (error) {
      console.error('Failed to stop workout:', error);
    }
  };

  const handleNextStep = async () => {
    try {
      await workoutEngine.nextStep();
      setEngineState(workoutEngine.getState());
    } catch (error) {
      console.error('Failed to move to next step:', error);
    }
  };

  const handlePreviousStep = async () => {
    try {
      await workoutEngine.previousStep();
      setEngineState(workoutEngine.getState());
    } catch (error) {
      console.error('Failed to move to previous step:', error);
    }
  };

  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getStepTypeColor = (type: string): string => {
    const colors = {
      warmup: 'bg-green-100 text-green-800 border-green-200',
      steady: 'bg-blue-100 text-blue-800 border-blue-200',
      interval: 'bg-red-100 text-red-800 border-red-200',
      recovery: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      cooldown: 'bg-purple-100 text-purple-800 border-purple-200'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStepTypeIcon = (type: string): string => {
    const icons = {
      warmup: '🔥',
      steady: '➡️',
      interval: '⚡',
      recovery: '😌',
      cooldown: '❄️'
    };
    return icons[type as keyof typeof icons] || '📍';
  };

  if (countdown > 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Get Ready!</h2>
          <div className="text-6xl font-bold text-blue-600 mb-4">{countdown}</div>
          <p className="text-gray-600">Workout starting in...</p>
        </div>
      </div>
    );
  }

  if (!isStarted) {
    return (
      <div className="space-y-6">
        {/* Workout Overview */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-2">{workoutPlan.name}</h2>
          <p className="text-gray-600 mb-4">{workoutPlan.description}</p>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(workoutPlan.totalDuration / 60)}
              </div>
              <div className="text-sm text-gray-600">Minutes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {workoutPlan.steps.length}
              </div>
              <div className="text-sm text-gray-600">Steps</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {workoutPlan.difficulty}
              </div>
              <div className="text-sm text-gray-600">Difficulty</div>
            </div>
          </div>

          {/* Connection Status & Auto Control */}
          {!connectedEquipment && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-yellow-600">⚠️</span>
                <h4 className="font-medium text-yellow-900">Offline Mode</h4>
              </div>
              <p className="text-sm text-yellow-800">
                No equipment connected. You can practice this workout but won't get real-time data or resistance control.
              </p>
            </div>
          )}

          {connectedEquipment && (
            <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">Auto Resistance Control</h4>
                <p className="text-sm text-gray-600">
                  Automatically adjust resistance based on workout steps
                </p>
              </div>
              <button
                onClick={() => setAutoControl(!autoControl)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoControl ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoControl ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          )}

          {/* Start Button */}
          <button
            onClick={handleStart}
            className="w-full bg-green-600 text-white py-4 px-6 rounded-lg font-semibold hover:bg-green-700 transition-colors"
          >
            {connectedEquipment ? 'Start Workout' : 'Start Practice Mode'}
          </button>
        </div>

        {/* Workout Steps Preview */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Workout Steps</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {workoutPlan.steps.map((step, index) => (
              <div key={step.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <span className="text-lg">{getStepTypeIcon(step.type)}</span>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStepTypeColor(step.type)}`}>
                      {step.type}
                    </span>
                  </div>
                  <div className="font-medium text-gray-900">
                    {step.name || `Step ${index + 1}`}
                  </div>
                  <div className="text-sm text-gray-600">
                    {formatTime(step.duration * 1000)} • {step.targetMetrics.resistance || 0}% resistance
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cancel Button */}
        <button
          onClick={onCancel}
          className="w-full py-3 px-6 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel Workout
        </button>
      </div>
    );
  }

  const currentStep = engineState.currentStep;
  const nextStep = engineState.nextStep;

  return (
    <div className="space-y-3">
      {/* Overall Progress */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <div className="text-sm font-medium text-gray-700 mb-3">Overall Progress</div>
        <div className="flex justify-between items-center text-lg text-gray-600 mb-2">
          <span className="font-bold">{Math.round(totalProgress * 100)}%</span>
          <span>{formatTime(workoutEngine.getRemainingTime())} left</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${totalProgress * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Current Step */}
      {currentStep && (
        <div className={`rounded-lg p-4 shadow-sm border-2 ${getStepTypeColor(currentStep.type)}`}>
          <div className="text-sm font-medium text-gray-700 mb-3">Current Step</div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{getStepTypeIcon(currentStep.type)}</span>
              <span className="text-lg font-medium opacity-75">{currentStep.type}</span>
            </div>
            <div className="text-xl font-bold">
              {formatTime(workoutEngine.getStepRemainingTime())}
            </div>
          </div>

          {/* Step Progress */}
          <div className="mb-4">
            <div className="w-full bg-white bg-opacity-50 rounded-full h-3">
              <div
                className="bg-current h-3 rounded-full transition-all duration-300"
                style={{ width: `${stepProgress * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Target Metrics */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="flex items-center justify-center space-x-2">
              <span className="text-xl">🏔️</span>
              <span className="text-lg font-bold">{currentStep.targetMetrics.resistance || 0}</span>
              <span className="text-sm opacity-75">%</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <span className="text-xl">🔄</span>
              <span className="text-lg font-bold">{currentStep.targetMetrics.cadence || 0}</span>
              <span className="text-sm opacity-75">rpm</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <span className="text-xl">⚡</span>
              <span className="text-lg font-bold">{currentStep.targetMetrics.power || 0}</span>
              <span className="text-sm opacity-75">W</span>
            </div>
          </div>
        </div>
      )}

      {/* Live Metrics */}
      <LiveMetrics isActive={engineState.isActive} compact={true} />

      {/* Workout Averages */}
      <WorkoutAverages />

      {/* Workout Controls */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="grid grid-cols-2 gap-3 mb-4">
          {engineState.isActive ? (
            <button
              onClick={handlePause}
              className="py-3 px-6 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 transition-colors"
            >
              Pause
            </button>
          ) : (
            <button
              onClick={handleResume}
              className="py-3 px-6 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              Resume
            </button>
          )}
          <button
            onClick={handleStop}
            className="py-3 px-6 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
          >
            Stop
          </button>
        </div>
      </div>
    </div>
  );
}