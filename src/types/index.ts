// Core equipment types
export type EquipmentType = 'bike' | 'treadmill' | 'rower';

export interface EquipmentProfile {
  id: string;
  name: string;
  type: EquipmentType;
  bluetoothId?: string;
  characteristics: {
    serviceUUID: string;
    dataCharacteristic: string;
    controlCharacteristic?: string;
  };
  capabilities: {
    canControlResistance: boolean;
    canControlSpeed: boolean;
    hasHeartRateMonitor: boolean;
  };
  createdAt: number;
  lastConnected?: number;
}

// Workout types
export type WorkoutStepType = 'warmup' | 'interval' | 'steady' | 'recovery' | 'cooldown';

export interface WorkoutStep {
  id: string;
  duration: number; // seconds
  targetMetrics: Record<string, number>; // e.g., { resistance: 50, rpm: 80 }
  type: WorkoutStepType;
  name?: string;
  description?: string;
}

export interface WorkoutPlan {
  id: string;
  name: string;
  description?: string;
  equipmentType: EquipmentType;
  steps: WorkoutStep[];
  totalDuration: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  tags: string[];
  isTemplate: boolean;
  createdAt: number;
  modifiedAt: number;
}

// Session tracking
export interface MetricDataPoint {
  timestamp: number;
  metrics: Record<string, number>; // e.g., { rpm: 75, watts: 150, resistance: 45 }
  stepId?: string;
}

export interface SessionSummary {
  totalDuration: number;
  avgMetrics: Record<string, number>;
  maxMetrics: Record<string, number>;
  totalDistance?: number;
  estimatedCalories: number;
  completed: boolean;
}

export interface WorkoutSession {
  id: string;
  workoutId: string;
  workoutName: string;
  equipmentId: string;
  startTime: number;
  endTime?: number;
  dataPoints: MetricDataPoint[];
  summary?: SessionSummary;
  notes?: string;
}

// Analytics
export interface PerformanceMetric {
  id: string;
  sessionId: string;
  metricType: string; // 'power', 'cadence', 'heart_rate', etc.
  value: number;
  timestamp: number;
  equipmentType: EquipmentType;
}

export interface PersonalRecord {
  id: string;
  metricType: string;
  value: number;
  sessionId: string;
  achievedAt: number;
  equipmentType: EquipmentType;
}

// App settings
export interface AppSettings {
  units: {
    distance: 'km' | 'miles';
    weight: 'kg' | 'lbs';
    temperature: 'celsius' | 'fahrenheit';
  };
  display: {
    theme: 'light' | 'dark' | 'auto';
    showHeartRate: boolean;
    showPower: boolean;
    showCadence: boolean;
  };
  notifications: {
    workoutReminders: boolean;
    achievements: boolean;
    deviceConnection: boolean;
  };
  privacy: {
    storeHeartRate: boolean;
    shareAnalytics: boolean;
  };
}

// Bluetooth related types
export interface BluetoothConnectionState {
  isConnected: boolean;
  deviceId?: string;
  deviceName?: string;
  lastConnected?: number;
  connectionError?: string;
}

export interface FTMSData {
  speed?: number; // km/h
  cadence?: number; // rpm
  power?: number; // watts
  resistance?: number; // percentage
  heartRate?: number; // bpm
  distance?: number; // meters
  calories?: number;
  timestamp: number;
}

// Export/Import types
export interface ExportData {
  version: string;
  exportedAt: number;
  workouts: WorkoutPlan[];
  sessions: WorkoutSession[];
  equipment: EquipmentProfile[];
  settings: AppSettings;
  personalRecords: PersonalRecord[];
}

export interface ImportResult {
  success: boolean;
  imported: {
    workouts: number;
    sessions: number;
    equipment: number;
  };
  errors: string[];
}

// UI State types
export interface UIState {
  isOnline: boolean;
  currentPage: string;
  bluetooth: BluetoothConnectionState;
  activeWorkout?: {
    sessionId: string;
    startTime: number;
    currentStep: number;
  };
}