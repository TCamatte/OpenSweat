import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '@/core/storage/app-store';
import { deviceManager } from '@/core/bluetooth/device-manager';
import { sessionRecorder } from '@/core/workout/session-recorder';
import LiveMetrics from '@/components/dashboard/LiveMetrics';
import ResistanceControl from '@/components/bluetooth/ResistanceControl';

export default function WorkoutPage() {
  const { bluetooth, connectedEquipment } = useAppStore();
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentResistance, setCurrentResistance] = useState(0);

  useEffect(() => {
    // Check if there's an active session
    const activeSession = sessionRecorder.getCurrentSession();
    if (activeSession) {
      setIsSessionActive(true);
      setSessionId(activeSession.id);
    }
  }, []);

  const handleStartQuickWorkout = async () => {
    if (!connectedEquipment) {
      alert('Please connect your equipment first');
      return;
    }

    try {
      const newSessionId = await sessionRecorder.createQuickSession(connectedEquipment.id);
      setSessionId(newSessionId);
      setIsSessionActive(true);

      // Start workout control on device
      await deviceManager.startWorkout();
    } catch (error) {
      console.error('Failed to start workout:', error);
      alert('Failed to start workout. Please try again.');
    }
  };

  const handlePauseWorkout = async () => {
    try {
      await sessionRecorder.pauseSession();
      setIsSessionActive(false);
    } catch (error) {
      console.error('Failed to pause workout:', error);
    }
  };

  const handleResumeWorkout = async () => {
    try {
      await sessionRecorder.resumeSession();
      setIsSessionActive(true);
    } catch (error) {
      console.error('Failed to resume workout:', error);
    }
  };

  const handleStopWorkout = async () => {
    try {
      await sessionRecorder.stopSession();
      await deviceManager.stopWorkout();
      setIsSessionActive(false);
      setSessionId(null);

      alert('Workout completed! Check your history for session details.');
    } catch (error) {
      console.error('Failed to stop workout:', error);
    }
  };

  const handleResistanceChange = (level: number) => {
    setCurrentResistance(level);
  };

  if (!bluetooth.isConnected) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Workout</h2>
          <p className="text-gray-600">Connect your equipment to start training</p>
        </div>

        <div className="text-center py-16">
          <div className="text-6xl mb-4">📡</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Equipment Not Connected
          </h3>
          <p className="text-gray-600 mb-6">
            Connect your Domyos equipment to start your workout session.
          </p>
          <Link
            to="/connect"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Connect Equipment
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Workout</h2>
        <p className="text-gray-600">
          {isSessionActive ? 'Training in progress' : 'Ready to start training'}
        </p>
      </div>

      {/* Session Controls */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Session Control</h3>
          <div className="text-sm text-gray-600">
            {connectedEquipment?.name}
          </div>
        </div>

        {!sessionId ? (
          <button
            onClick={handleStartQuickWorkout}
            className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 transition-colors"
          >
            Start Quick Workout
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Session Status:</span>
              <span className={`font-medium ${
                isSessionActive ? 'text-green-600' : 'text-yellow-600'
              }`}>
                {isSessionActive ? 'Active' : 'Paused'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {isSessionActive ? (
                <button
                  onClick={handlePauseWorkout}
                  className="bg-yellow-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-yellow-700 transition-colors"
                >
                  Pause
                </button>
              ) : (
                <button
                  onClick={handleResumeWorkout}
                  className="bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  Resume
                </button>
              )}
              <button
                onClick={handleStopWorkout}
                className="bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Stop
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Live Metrics */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Live Metrics</h3>
        <LiveMetrics isActive={isSessionActive} />
      </div>

      {/* Resistance Control */}
      {connectedEquipment?.capabilities.canControlResistance && (
        <ResistanceControl
          currentResistance={currentResistance}
          onResistanceChange={handleResistanceChange}
          disabled={!isSessionActive}
        />
      )}

      {/* Session Info */}
      {sessionId && (
        <div className="bg-gray-50 rounded-xl p-4">
          <h4 className="font-medium text-gray-900 mb-2">Session Info</h4>
          <div className="space-y-1 text-sm text-gray-600">
            <div>Duration: {Math.floor(sessionRecorder.getSessionDuration() / 60000)}m</div>
            <div>Data points: {sessionRecorder.getDataPointCount()}</div>
            <div>Session ID: {sessionId.slice(-8)}</div>
          </div>
        </div>
      )}
    </div>
  );
}