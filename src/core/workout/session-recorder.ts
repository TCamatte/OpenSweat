import {
  WorkoutSession,
  MetricDataPoint,
  WorkoutPlan,
  EquipmentProfile,
  SessionSummary
} from '@/types';
import { storageManager } from '@/core/storage/local-storage-manager';
import { deviceManager } from '@/core/bluetooth/device-manager';

export class SessionRecorder {
  private currentSession: WorkoutSession | null = null;
  private isRecording = false;
  private recordingInterval: number | null = null;
  private startTime: number = 0;

  async startSession(
    workoutPlan: WorkoutPlan,
    equipment: EquipmentProfile | null
  ): Promise<string> {
    if (this.isRecording) {
      throw new Error('A session is already being recorded');
    }

    this.startTime = Date.now();

    this.currentSession = {
      id: `session_${this.startTime}`,
      workoutId: workoutPlan.id,
      workoutName: workoutPlan.name,
      equipmentId: equipment?.id || 'offline',
      startTime: this.startTime,
      dataPoints: [],
      notes: ''
    };

    this.isRecording = true;

    // Set up data recording
    this.setupDataRecording();

    // Save initial session
    await storageManager.saveSession(this.currentSession);

    console.log('Session recording started:', this.currentSession.id);
    return this.currentSession.id;
  }

  async pauseSession(): Promise<void> {
    if (!this.isRecording || !this.currentSession) {
      throw new Error('No active session to pause');
    }

    this.stopDataRecording();
    this.isRecording = false;

    // Update session in storage
    await storageManager.saveSession(this.currentSession);

    console.log('Session paused');
  }

  async resumeSession(): Promise<void> {
    if (this.isRecording || !this.currentSession) {
      throw new Error('No paused session to resume');
    }

    this.isRecording = true;
    this.setupDataRecording();

    console.log('Session resumed');
  }

  async stopSession(notes?: string): Promise<WorkoutSession> {
    if (!this.currentSession) {
      throw new Error('No active session to stop');
    }

    this.stopDataRecording();
    this.isRecording = false;

    // Finalize session
    this.currentSession.endTime = Date.now();
    if (notes) {
      this.currentSession.notes = notes;
    }

    // Calculate session summary
    this.currentSession.summary = this.calculateSessionSummary();

    // Save final session
    await storageManager.saveSession(this.currentSession);

    const completedSession = { ...this.currentSession };
    this.currentSession = null;

    console.log('Session completed:', completedSession.id);
    return completedSession;
  }

  async cancelSession(): Promise<void> {
    if (!this.currentSession) {
      throw new Error('No active session to cancel');
    }

    this.stopDataRecording();

    // Delete session from storage
    await storageManager.deleteSession(this.currentSession.id);

    this.currentSession = null;
    this.isRecording = false;

    console.log('Session cancelled');
  }

  private setupDataRecording(): void {
    // Record data every 2 seconds
    this.recordingInterval = window.setInterval(() => {
      this.recordDataPoint();
    }, 2000);

    // Set up device data listener
    deviceManager.onData((data) => {
      if (this.isRecording && this.currentSession) {
        this.addDataPoint(data);
      }
    });
  }

  private stopDataRecording(): void {
    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
      this.recordingInterval = null;
    }
  }

  private recordDataPoint(): void {
    if (!this.isRecording || !this.currentSession) return;

    // This would typically get current metrics from the device
    // For now, we'll rely on the device data listener
  }

  private addDataPoint(ftmsData: any): void {
    if (!this.currentSession) return;

    const dataPoint: MetricDataPoint = {
      timestamp: Date.now(),
      metrics: {
        speed: ftmsData.speed || 0,
        cadence: ftmsData.cadence || 0,
        power: ftmsData.power || 0,
        resistance: ftmsData.resistance || 0,
        heartRate: ftmsData.heartRate || 0,
        distance: ftmsData.distance || 0,
        calories: ftmsData.calories || 0
      }
    };

    this.currentSession.dataPoints.push(dataPoint);

    // Auto-save every 20 data points (roughly every 40 seconds)
    if (this.currentSession.dataPoints.length % 20 === 0) {
      this.autoSave();
    }
  }

  private async autoSave(): Promise<void> {
    if (!this.currentSession) return;

    try {
      await storageManager.saveSession(this.currentSession);
      console.log('Session auto-saved');
    } catch (error) {
      console.error('Failed to auto-save session:', error);
    }
  }

  private calculateSessionSummary(): SessionSummary {
    if (!this.currentSession || this.currentSession.dataPoints.length === 0) {
      return {
        totalDuration: 0,
        avgMetrics: {},
        maxMetrics: {},
        estimatedCalories: 0,
        completed: false
      };
    }

    const dataPoints = this.currentSession.dataPoints;
    const totalDuration = this.currentSession.endTime! - this.currentSession.startTime;

    // Calculate averages and maximums
    const metricSums: Record<string, number> = {};
    const metricMaxs: Record<string, number> = {};
    const metricCounts: Record<string, number> = {};

    dataPoints.forEach(point => {
      Object.entries(point.metrics).forEach(([key, value]) => {
        if (value > 0) { // Only count non-zero values
          metricSums[key] = (metricSums[key] || 0) + value;
          metricMaxs[key] = Math.max(metricMaxs[key] || 0, value);
          metricCounts[key] = (metricCounts[key] || 0) + 1;
        }
      });
    });

    // Calculate averages
    const avgMetrics: Record<string, number> = {};
    Object.keys(metricSums).forEach(key => {
      avgMetrics[key] = metricSums[key] / metricCounts[key];
    });

    // Estimate calories if not provided by device
    let estimatedCalories = metricMaxs.calories || 0;
    if (estimatedCalories === 0 && avgMetrics.power) {
      // Rough estimation: 1 watt ≈ 3.6 kcal/hour
      const durationHours = totalDuration / (1000 * 60 * 60);
      estimatedCalories = Math.round(avgMetrics.power * durationHours * 3.6);
    }

    return {
      totalDuration,
      avgMetrics,
      maxMetrics: metricMaxs,
      totalDistance: metricMaxs.distance,
      estimatedCalories,
      completed: !!this.currentSession.endTime
    };
  }

  // Getters
  getCurrentSession(): WorkoutSession | null {
    return this.currentSession;
  }

  isSessionActive(): boolean {
    return this.isRecording;
  }

  getSessionDuration(): number {
    if (!this.currentSession) return 0;
    const endTime = this.currentSession.endTime || Date.now();
    return endTime - this.currentSession.startTime;
  }

  getDataPointCount(): number {
    return this.currentSession?.dataPoints.length || 0;
  }

  getLatestMetrics(): Record<string, number> | null {
    if (!this.currentSession || this.currentSession.dataPoints.length === 0) {
      return null;
    }

    const latestPoint = this.currentSession.dataPoints[this.currentSession.dataPoints.length - 1];
    return latestPoint.metrics;
  }

  // Session management helpers
  async createQuickSession(equipmentId: string): Promise<string> {
    const equipment = await storageManager.getEquipmentById(equipmentId);
    if (!equipment) {
      throw new Error('Equipment not found');
    }

    // Create a quick workout plan
    const quickWorkout: WorkoutPlan = {
      id: `quick_${Date.now()}`,
      name: 'Quick Workout',
      description: 'Unstructured workout session',
      equipmentType: equipment.type,
      steps: [],
      totalDuration: 0,
      difficulty: 3,
      tags: ['quick', 'unstructured'],
      isTemplate: false,
      createdAt: Date.now(),
      modifiedAt: Date.now()
    };

    return this.startSession(quickWorkout, equipment);
  }

  async exportSession(sessionId: string): Promise<string> {
    const session = await storageManager.getSessionById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Export as JSON
    return JSON.stringify(session, null, 2);
  }
}

// Singleton instance
export const sessionRecorder = new SessionRecorder();