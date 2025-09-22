import { db } from '@/core/database/schema';
import {
  WorkoutPlan,
  WorkoutSession,
  EquipmentProfile,
  PerformanceMetric,
  PersonalRecord,
  AppSettings,
  ExportData,
  ImportResult,
  SessionSummary,
  MetricDataPoint
} from '@/types';

export class LocalStorageManager {
  // Workout management
  async saveWorkout(workout: WorkoutPlan): Promise<void> {
    await db.workouts.put(workout);
  }

  async getWorkouts(filter?: {
    equipmentType?: string;
    isTemplate?: boolean;
    tags?: string[];
  }): Promise<WorkoutPlan[]> {
    let collection = db.workouts.orderBy('modifiedAt').reverse();

    if (filter?.equipmentType) {
      collection = collection.filter(w => w.equipmentType === filter.equipmentType);
    }

    if (filter?.isTemplate !== undefined) {
      collection = collection.filter(w => w.isTemplate === filter.isTemplate);
    }

    if (filter?.tags && filter.tags.length > 0) {
      collection = collection.filter(w =>
        filter.tags!.some(tag => w.tags.includes(tag))
      );
    }

    return await collection.toArray();
  }

  async getWorkoutById(id: string): Promise<WorkoutPlan | undefined> {
    return await db.workouts.get(id);
  }

  async deleteWorkout(id: string): Promise<void> {
    await db.workouts.delete(id);
  }

  // Session management
  async saveSession(session: WorkoutSession): Promise<void> {
    // Calculate summary if not provided
    if (!session.summary && session.dataPoints.length > 0) {
      session.summary = this.calculateSessionSummary(session.dataPoints, session.startTime, session.endTime);
    }

    await db.sessions.put(session);

    // Update personal records
    if (session.summary) {
      await this.updatePersonalRecords(session);
    }
  }

  async getSessions(filter?: {
    workoutId?: string;
    equipmentId?: string;
    limit?: number;
    since?: number;
  }): Promise<WorkoutSession[]> {
    let collection = db.sessions.orderBy('startTime').reverse();

    if (filter?.workoutId) {
      collection = collection.filter(s => s.workoutId === filter.workoutId);
    }

    if (filter?.equipmentId) {
      collection = collection.filter(s => s.equipmentId === filter.equipmentId);
    }

    if (filter?.since) {
      collection = collection.filter(s => s.startTime >= filter.since!);
    }

    if (filter?.limit) {
      collection = collection.limit(filter.limit);
    }

    return await collection.toArray();
  }

  async getSessionById(id: string): Promise<WorkoutSession | undefined> {
    return await db.sessions.get(id);
  }

  async deleteSession(id: string): Promise<void> {
    await db.sessions.delete(id);
  }

  // Equipment management
  async saveEquipment(equipment: EquipmentProfile): Promise<void> {
    await db.equipment.put(equipment);
  }

  async getEquipment(): Promise<EquipmentProfile[]> {
    return await db.equipment.orderBy('lastConnected').reverse().toArray();
  }

  async getEquipmentById(id: string): Promise<EquipmentProfile | undefined> {
    return await db.equipment.get(id);
  }

  async updateLastConnected(equipmentId: string): Promise<void> {
    await db.equipment.update(equipmentId, { lastConnected: Date.now() });
  }

  async deleteEquipment(id: string): Promise<void> {
    await db.equipment.delete(id);
  }

  // Settings management
  async getSettings(): Promise<AppSettings> {
    const settings = await db.settings.get('default');
    return settings || this.getDefaultSettings();
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    await db.settings.put({ ...settings, id: 'default' } as any);
  }

  private getDefaultSettings(): AppSettings {
    return {
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
  }

  // Analytics
  async getPersonalRecords(equipmentType?: string): Promise<PersonalRecord[]> {
    let collection = db.records.orderBy('achievedAt').reverse();

    if (equipmentType) {
      collection = collection.filter(r => r.equipmentType === equipmentType);
    }

    return await collection.toArray();
  }

  private async updatePersonalRecords(session: WorkoutSession): Promise<void> {
    if (!session.summary) return;

    const equipment = await this.getEquipmentById(session.equipmentId);
    if (!equipment) return;

    const { maxMetrics } = session.summary;

    for (const [metricType, value] of Object.entries(maxMetrics)) {
      // Check if this is a new personal record
      const existingRecord = await db.records
        .where({ metricType, equipmentType: equipment.type })
        .first();

      if (!existingRecord || value > existingRecord.value) {
        const record: PersonalRecord = {
          id: `${session.id}_${metricType}`,
          metricType,
          value,
          sessionId: session.id,
          achievedAt: session.startTime,
          equipmentType: equipment.type
        };

        await db.records.put(record);
      }
    }
  }

  // Data export/import
  async exportAllData(): Promise<ExportData> {
    const [workouts, sessions, equipment, settings, records] = await Promise.all([
      this.getWorkouts(),
      this.getSessions(),
      this.getEquipment(),
      this.getSettings(),
      this.getPersonalRecords()
    ]);

    return {
      version: '1.0.0',
      exportedAt: Date.now(),
      workouts,
      sessions,
      equipment,
      settings,
      personalRecords: records
    };
  }

  async importData(data: ExportData): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      imported: { workouts: 0, sessions: 0, equipment: 0 },
      errors: []
    };

    try {
      await db.transaction('rw', db.workouts, db.sessions, db.equipment, db.settings, db.records, async () => {
        // Import workouts
        for (const workout of data.workouts) {
          try {
            await db.workouts.put(workout);
            result.imported.workouts++;
          } catch (error) {
            result.errors.push(`Failed to import workout ${workout.name}: ${error}`);
          }
        }

        // Import sessions
        for (const session of data.sessions) {
          try {
            await db.sessions.put(session);
            result.imported.sessions++;
          } catch (error) {
            result.errors.push(`Failed to import session ${session.id}: ${error}`);
          }
        }

        // Import equipment
        for (const equip of data.equipment) {
          try {
            await db.equipment.put(equip);
            result.imported.equipment++;
          } catch (error) {
            result.errors.push(`Failed to import equipment ${equip.name}: ${error}`);
          }
        }

        // Import settings
        if (data.settings) {
          await this.saveSettings(data.settings);
        }

        // Import personal records
        for (const record of data.personalRecords) {
          try {
            await db.records.put(record);
          } catch (error) {
            result.errors.push(`Failed to import record ${record.id}: ${error}`);
          }
        }
      });

      result.success = result.errors.length === 0;
    } catch (error) {
      result.errors.push(`Transaction failed: ${error}`);
    }

    return result;
  }

  // Utility methods
  private calculateSessionSummary(
    dataPoints: MetricDataPoint[],
    startTime: number,
    endTime?: number
  ): SessionSummary {
    const duration = endTime ? endTime - startTime : Date.now() - startTime;

    if (dataPoints.length === 0) {
      return {
        totalDuration: duration,
        avgMetrics: {},
        maxMetrics: {},
        estimatedCalories: Math.round(duration / (1000 * 60) * 8), // Rough estimate: 8 cal/min
        completed: !!endTime
      };
    }

    const metrics: Record<string, number[]> = {};

    // Collect all metric values
    dataPoints.forEach(point => {
      Object.entries(point.metrics).forEach(([key, value]) => {
        if (!metrics[key]) metrics[key] = [];
        metrics[key].push(value);
      });
    });

    // Calculate averages and maximums
    const avgMetrics: Record<string, number> = {};
    const maxMetrics: Record<string, number> = {};

    Object.entries(metrics).forEach(([key, values]) => {
      avgMetrics[key] = values.reduce((sum, val) => sum + val, 0) / values.length;
      maxMetrics[key] = Math.max(...values);
    });

    // Estimate calories (simplified calculation)
    const avgPower = avgMetrics.power || 0;
    const durationHours = duration / (1000 * 60 * 60);
    const estimatedCalories = Math.round(avgPower * durationHours * 3.6); // Rough estimation

    return {
      totalDuration: duration,
      avgMetrics,
      maxMetrics,
      totalDistance: maxMetrics.distance,
      estimatedCalories,
      completed: !!endTime
    };
  }

  // Database maintenance
  async clearAllData(): Promise<void> {
    await db.transaction('rw', db.workouts, db.sessions, db.equipment, db.metrics, db.records, async () => {
      await Promise.all([
        db.workouts.clear(),
        db.sessions.clear(),
        db.equipment.clear(),
        db.metrics.clear(),
        db.records.clear()
      ]);
    });
  }

  async clearHistoryData(): Promise<void> {
    await db.transaction('rw', db.sessions, db.metrics, async () => {
      await Promise.all([
        db.sessions.clear(),
        db.metrics.clear()
      ]);
    });
  }

  async clearAnalyticsData(): Promise<void> {
    await db.transaction('rw', db.sessions, db.metrics, db.records, async () => {
      await Promise.all([
        db.sessions.clear(),
        db.metrics.clear(),
        db.records.clear()
      ]);
    });
  }

  async clearWorkoutPlans(): Promise<void> {
    await db.transaction('rw', db.workouts, async () => {
      await db.workouts.where('isTemplate').equals(false).delete();
    });
  }

  async getDatabaseStats() {
    const [workoutCount, sessionCount, equipmentCount, recordCount] = await Promise.all([
      db.workouts.count(),
      db.sessions.count(),
      db.equipment.count(),
      db.records.count()
    ]);

    return {
      workouts: workoutCount,
      sessions: sessionCount,
      equipment: equipmentCount,
      personalRecords: recordCount
    };
  }
}

export const storageManager = new LocalStorageManager();