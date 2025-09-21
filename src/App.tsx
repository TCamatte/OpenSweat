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
import HistoryPage from '@/pages/history/HistoryPage';

function App() {
  const {
    setOnlineStatus,
    loadSettings,
    loadRecentSessions
  } = useAppStore();

  useEffect(() => {
    // Initialize app data
    const initializeApp = async () => {
      try {
        await loadSettings();
        await loadRecentSessions();
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
  }, [setOnlineStatus, loadSettings, loadRecentSessions]);

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
            <Route path="/history" element={<HistoryPage />} />
          </Routes>
        </Layout>
      </div>
    </Router>
  );
}

export default App;