import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { useAppStore } from '@/core/storage/app-store';
import { offlineManager } from '@/core/storage/offline-manager';

// Layout components
import Layout from '@/components/Layout';
import OfflineIndicator from '@/components/OfflineIndicator';

// Page components
import HomePage from '@/pages/HomePage';
import ConnectPage from '@/pages/connect/ConnectPage';
import WorkoutPage from '@/pages/workout/WorkoutPage';
import PlanningPage from '@/pages/workout/PlanningPage';
import HistoryPage from '@/pages/history/HistoryPage';

function App() {
  const {
    setOnlineStatus,
    loadSettings,
    loadRecentSessions,
    attemptAutoReconnect,
    activeWorkout
  } = useAppStore();

  useEffect(() => {
    // Initialize app data
    const initializeApp = async () => {
      try {
        await loadSettings();
        await loadRecentSessions();

        // Attempt to auto-reconnect to the last connected equipment
        // Add a small delay to ensure the app is fully initialized
        setTimeout(async () => {
          await attemptAutoReconnect();
        }, 1000);
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };

    initializeApp();

    // Set up offline monitoring
    const unsubscribe = offlineManager.onOnlineStatusChange((isOnline) => {
      setOnlineStatus(isOnline);
    });

    return unsubscribe;
  }, [setOnlineStatus, loadSettings, loadRecentSessions, attemptAutoReconnect]);

  // Set up page refresh warning when workout is in progress
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (activeWorkout && !activeWorkout.isPaused) {
        event.preventDefault();
        event.returnValue = 'You have an active workout in progress. Are you sure you want to leave? Your workout data may be lost.';
        return event.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [activeWorkout]);

  // Prevent pull-to-refresh on Chrome for Android when workout is active
  useEffect(() => {
    if (activeWorkout && !activeWorkout.isPaused) {
      console.log("overscrollBehaviorY");
      document.body.style.overscrollBehavior = 'contain';
    } else {
      document.body.style.overscrollBehavior = 'contain';
    }

    // Cleanup on unmount
    return () => {
      console.log("unmount");
      document.body.style.overscrollBehaviorY = 'contain';
    };
  }, [activeWorkout]);

  return (
    <Router>
      <div className="app">
        <OfflineIndicator />
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/connect" element={<ConnectPage />} />
            <Route path="/workout" element={<WorkoutPage />} />
            <Route path="/workout/:workoutId" element={<WorkoutPage />} />
            <Route path="/planning" element={<PlanningPage />} />
            <Route path="/history" element={<HistoryPage />} />
          </Routes>
        </Layout>
      </div>
    </Router>
  );
}

export default App;