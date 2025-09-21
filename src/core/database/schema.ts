import Dexie, { Table } from 'dexie';
import {
  WorkoutPlan,
  WorkoutSession,
  EquipmentProfile,
  PerformanceMetric,
  PersonalRecord,
  AppSettings
} from '@/types';

export class WorkoutDatabase extends Dexie {
  workouts!: Table<WorkoutPlan>;
  sessions!: Table<WorkoutSession>;
  equipment!: Table<EquipmentProfile>;
  metrics!: Table<PerformanceMetric>;
  records!: Table<PersonalRecord>;
  settings!: Table<AppSettings>;

  constructor() {
    super('WorkoutDatabase');

    this.version(1).stores({
      workouts: 'id, name, equipmentType, difficulty, isTemplate, createdAt, modifiedAt, *tags',
      sessions: 'id, workoutId, equipmentId, startTime, endTime, &[workoutId+startTime]',
      equipment: 'id, name, type, bluetoothId, createdAt, lastConnected',
      metrics: 'id, sessionId, metricType, timestamp, equipmentType, &[sessionId+timestamp]',
      records: 'id, metricType, equipmentType, achievedAt, sessionId',
      settings: 'id'
    });

    // Add hooks for data validation and defaults
    this.workouts.hook('creating', (primKey, obj, trans) => {
      obj.createdAt = obj.createdAt || Date.now();
      obj.modifiedAt = obj.modifiedAt || Date.now();
      obj.totalDuration = obj.steps.reduce((total, step) => total + step.duration, 0);
    });

    this.workouts.hook('updating', (modifications, primKey, obj, trans) => {
      modifications.modifiedAt = Date.now();
      if (modifications.steps) {
        modifications.totalDuration = modifications.steps.reduce(
          (total: number, step: any) => total + step.duration, 0
        );
      }
    });

    this.sessions.hook('creating', (primKey, obj, trans) => {
      obj.startTime = obj.startTime || Date.now();
    });

    this.equipment.hook('creating', (primKey, obj, trans) => {
      obj.createdAt = obj.createdAt || Date.now();
    });
  }
}

export const db = new WorkoutDatabase();