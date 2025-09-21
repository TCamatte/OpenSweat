import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  UIState,
  BluetoothConnectionState,
  AppSettings,
  WorkoutSession,
  EquipmentProfile
} from '@/types';
import { storageManager } from './local-storage-manager';

interface AppState extends UIState {
  // Settings
  settings: AppSettings;

  // Current workout state
  activeWorkout?: {
    sessionId: string;
    startTime: number;
    currentStep: number;
    isPaused: boolean;
  };

  // Recent data for quick access
  recentSessions: WorkoutSession[];
  connectedEquipment?: EquipmentProfile;

  // Actions
  updateSettings: (settings: Partial<AppSettings>) => void;
  setOnlineStatus: (isOnline: boolean) => void;
  setCurrentPage: (page: string) => void;
  setBluetoothState: (state: Partial<BluetoothConnectionState>) => void;
  setConnectedEquipment: (equipment?: EquipmentProfile) => void;
  startWorkout: (sessionId: string) => void;
  pauseWorkout: () => void;
  resumeWorkout: () => void;
  stopWorkout: () => void;
  nextWorkoutStep: () => void;
  previousWorkoutStep: () => void;
  loadRecentSessions: () => Promise<void>;
  loadSettings: () => Promise<void>;
}

const defaultSettings: AppSettings = {
  units: {
    distance: 'km',
    weight: 'kg',
    temperature: 'celsius'
  },
  display: {
    theme: 'auto',
    showHeartRate: true,
    showPower: true,
    showCadence: true
  },
  notifications: {
    workoutReminders: true,
    achievements: true,
    deviceConnection: true
  },
  privacy: {
    storeHeartRate: true,
    shareAnalytics: false
  }
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      isOnline: navigator.onLine,
      currentPage: '/',
      bluetooth: {
        isConnected: false
      },
      settings: defaultSettings,
      recentSessions: [],

      // Actions
      updateSettings: async (newSettings) => {
        const currentSettings = get().settings;
        const updatedSettings = { ...currentSettings, ...newSettings };

        set({ settings: updatedSettings });

        // Persist to IndexedDB
        try {
          await storageManager.saveSettings(updatedSettings);
        } catch (error) {
          console.error('Failed to save settings:', error);
        }
      },

      setOnlineStatus: (isOnline) => {
        set({ isOnline });
      },

      setCurrentPage: (page) => {
        set({ currentPage: page });
      },

      setBluetoothState: (state) => {
        const currentBluetooth = get().bluetooth;
        set({
          bluetooth: { ...currentBluetooth, ...state }
        });
      },

      setConnectedEquipment: (equipment) => {
        set({ connectedEquipment: equipment });

        // Update bluetooth state
        if (equipment) {
          get().setBluetoothState({
            isConnected: true,
            deviceId: equipment.id,
            deviceName: equipment.name,
            lastConnected: Date.now()
          });
        } else {
          get().setBluetoothState({
            isConnected: false,
            deviceId: undefined,
            deviceName: undefined
          });
        }
      },

      startWorkout: (sessionId) => {
        set({
          activeWorkout: {
            sessionId,
            startTime: Date.now(),
            currentStep: 0,
            isPaused: false
          }
        });
      },

      pauseWorkout: () => {
        const activeWorkout = get().activeWorkout;
        if (activeWorkout) {
          set({
            activeWorkout: {
              ...activeWorkout,
              isPaused: true
            }
          });
        }
      },

      resumeWorkout: () => {
        const activeWorkout = get().activeWorkout;
        if (activeWorkout) {
          set({
            activeWorkout: {
              ...activeWorkout,
              isPaused: false
            }
          });
        }
      },

      stopWorkout: () => {
        set({ activeWorkout: undefined });
      },

      nextWorkoutStep: () => {
        const activeWorkout = get().activeWorkout;
        if (activeWorkout) {
          set({
            activeWorkout: {
              ...activeWorkout,
              currentStep: activeWorkout.currentStep + 1
            }
          });
        }
      },

      previousWorkoutStep: () => {
        const activeWorkout = get().activeWorkout;
        if (activeWorkout && activeWorkout.currentStep > 0) {
          set({
            activeWorkout: {
              ...activeWorkout,
              currentStep: activeWorkout.currentStep - 1
            }
          });
        }
      },

      loadRecentSessions: async () => {
        try {
          const sessions = await storageManager.getSessions({ limit: 10 });
          set({ recentSessions: sessions });
        } catch (error) {
          console.error('Failed to load recent sessions:', error);
        }
      },

      loadSettings: async () => {
        try {
          const settings = await storageManager.getSettings();
          set({ settings });
        } catch (error) {
          console.error('Failed to load settings:', error);
        }
      }
    }),
    {
      name: 'opensweat-app-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist certain parts of the state to localStorage
        settings: state.settings,
        bluetooth: {
          deviceId: state.bluetooth.deviceId,
          deviceName: state.bluetooth.deviceName,
          lastConnected: state.bluetooth.lastConnected
        }
      })
    }
  )
);

// Workout-specific store for real-time data
interface WorkoutState {
  isActive: boolean;
  currentMetrics: Record<string, number>;
  targetMetrics: Record<string, number>;
  averageMetrics: Record<string, number>;
  metricHistory: Record<string, number[]>;
  elapsedTime: number;
  currentStepTime: number;
  totalSteps: number;
  currentStepIndex: number;

  // Actions
  updateMetrics: (metrics: Record<string, number>) => void;
  setTargetMetrics: (metrics: Record<string, number>) => void;
  updateTimers: (elapsed: number, stepTime: number) => void;
  setWorkoutInfo: (totalSteps: number, currentStep: number) => void;
  resetWorkout: () => void;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  // Initial state
  isActive: false,
  currentMetrics: {},
  targetMetrics: {},
  averageMetrics: {},
  metricHistory: {},
  elapsedTime: 0,
  currentStepTime: 0,
  totalSteps: 0,
  currentStepIndex: 0,

  // Actions
  updateMetrics: (metrics) => {
    const state = get();
    const newHistory = { ...state.metricHistory };
    const newAverages = { ...state.averageMetrics };

    // Update history and calculate averages for each metric
    Object.entries(metrics).forEach(([key, value]) => {
      if (value > 0) { // Only track positive values
        if (!newHistory[key]) {
          newHistory[key] = [];
        }
        newHistory[key].push(value);

        // Calculate average
        const sum = newHistory[key].reduce((acc, val) => acc + val, 0);
        newAverages[key] = sum / newHistory[key].length;
      }
    });

    set({
      currentMetrics: metrics,
      metricHistory: newHistory,
      averageMetrics: newAverages
    });
  },

  setTargetMetrics: (metrics) => {
    set({ targetMetrics: metrics });
  },

  updateTimers: (elapsed, stepTime) => {
    set({ elapsedTime: elapsed, currentStepTime: stepTime });
  },

  setWorkoutInfo: (totalSteps, currentStep) => {
    set({
      totalSteps,
      currentStepIndex: currentStep,
      isActive: true
    });
  },

  resetWorkout: () => {
    set({
      isActive: false,
      currentMetrics: {},
      targetMetrics: {},
      averageMetrics: {},
      metricHistory: {},
      elapsedTime: 0,
      currentStepTime: 0,
      totalSteps: 0,
      currentStepIndex: 0
    });
  }
}));

// Equipment connection store
interface EquipmentState {
  isScanning: boolean;
  availableDevices: BluetoothDevice[];
  connectionError?: string;

  // Actions
  setScanning: (scanning: boolean) => void;
  addAvailableDevice: (device: BluetoothDevice) => void;
  clearAvailableDevices: () => void;
  setConnectionError: (error?: string) => void;
}

export const useEquipmentStore = create<EquipmentState>((set) => ({
  // Initial state
  isScanning: false,
  availableDevices: [],

  // Actions
  setScanning: (scanning) => {
    set({ isScanning: scanning });
  },

  addAvailableDevice: (device) => {
    set((state) => ({
      availableDevices: [...state.availableDevices.filter(d => d.id !== device.id), device]
    }));
  },

  clearAvailableDevices: () => {
    set({ availableDevices: [] });
  },

  setConnectionError: (error) => {
    set({ connectionError: error });
  }
}));