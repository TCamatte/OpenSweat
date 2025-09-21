import { WorkoutSession, PersonalRecord, PerformanceMetric } from '@/types';
import { storageManager } from '@/core/storage/local-storage-manager';

export interface PerformanceStats {
  totalSessions: number;
  totalDuration: number; // milliseconds
  totalCalories: number;
  totalDistance: number; // meters
  averageSessionDuration: number;
  averagePower: number;
  averageCadence: number;
  averageHeartRate: number;
}

export interface TrendData {
  dates: string[];
  values: number[];
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
}

export interface WeeklyProgress {
  week: string;
  sessions: number;
  duration: number;
  calories: number;
  avgPower: number;
}

export interface PowerZone {
  zone: number;
  name: string;
  minPower: number;
  maxPower: number;
  timeInZone: number; // seconds
  percentage: number;
}

export class PerformanceAnalytics {
  async getOverallStats(timeRange?: { start: Date; end: Date }): Promise<PerformanceStats> {
    const sessions = await this.getSessionsInRange(timeRange);

    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        totalDuration: 0,
        totalCalories: 0,
        totalDistance: 0,
        averageSessionDuration: 0,
        averagePower: 0,
        averageCadence: 0,
        averageHeartRate: 0
      };
    }

    const totalDuration = sessions.reduce((sum, session) =>
      sum + (session.summary?.totalDuration || 0), 0
    );

    const totalCalories = sessions.reduce((sum, session) =>
      sum + (session.summary?.estimatedCalories || 0), 0
    );

    const totalDistance = sessions.reduce((sum, session) =>
      sum + (session.summary?.maxMetrics['distance'] || 0), 0
    );

    // Calculate averages from non-zero values
    const powerValues = sessions
      .map(s => s.summary?.avgMetrics['power'] || 0)
      .filter(p => p > 0);

    const cadenceValues = sessions
      .map(s => s.summary?.avgMetrics['cadence'] || 0)
      .filter(c => c > 0);

    const heartRateValues = sessions
      .map(s => s.summary?.avgMetrics['heartRate'] || 0)
      .filter(hr => hr > 0);

    return {
      totalSessions: sessions.length,
      totalDuration,
      totalCalories,
      totalDistance,
      averageSessionDuration: totalDuration / sessions.length,
      averagePower: powerValues.length > 0 ?
        powerValues.reduce((sum, p) => sum + p, 0) / powerValues.length : 0,
      averageCadence: cadenceValues.length > 0 ?
        cadenceValues.reduce((sum, c) => sum + c, 0) / cadenceValues.length : 0,
      averageHeartRate: heartRateValues.length > 0 ?
        heartRateValues.reduce((sum, hr) => sum + hr, 0) / heartRateValues.length : 0
    };
  }

  async getPowerTrend(days: number = 30): Promise<TrendData> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));

    const sessions = await this.getSessionsInRange({ start: startDate, end: endDate });

    // Group sessions by day
    const dailyData = new Map<string, number[]>();

    sessions.forEach(session => {
      const date = new Date(session.startTime).toISOString().split('T')[0];
      const power = session.summary?.avgMetrics['power'] || 0;

      if (power > 0) {
        if (!dailyData.has(date)) {
          dailyData.set(date, []);
        }
        dailyData.get(date)!.push(power);
      }
    });

    // Calculate daily averages
    const dates: string[] = [];
    const values: number[] = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000));
      const dateStr = date.toISOString().split('T')[0];
      dates.push(dateStr);

      const dayPowers = dailyData.get(dateStr) || [];
      const avgPower = dayPowers.length > 0 ?
        dayPowers.reduce((sum, p) => sum + p, 0) / dayPowers.length : 0;
      values.push(avgPower);
    }

    // Calculate trend
    const recentAvg = this.calculateAverage(values.slice(-7)); // Last 7 days
    const previousAvg = this.calculateAverage(values.slice(-14, -7)); // Previous 7 days

    let trend: 'up' | 'down' | 'stable' = 'stable';
    let changePercent = 0;

    if (previousAvg > 0) {
      changePercent = ((recentAvg - previousAvg) / previousAvg) * 100;
      if (Math.abs(changePercent) > 5) {
        trend = changePercent > 0 ? 'up' : 'down';
      }
    }

    return { dates, values, trend, changePercent };
  }

  async getWeeklyProgress(weeks: number = 12): Promise<WeeklyProgress[]> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (weeks * 7 * 24 * 60 * 60 * 1000));

    const sessions = await this.getSessionsInRange({ start: startDate, end: endDate });

    const weeklyData: WeeklyProgress[] = [];

    for (let i = 0; i < weeks; i++) {
      const weekStart = new Date(startDate.getTime() + (i * 7 * 24 * 60 * 60 * 1000));
      const weekEnd = new Date(weekStart.getTime() + (6 * 24 * 60 * 60 * 1000));

      const weekSessions = sessions.filter(session => {
        const sessionDate = new Date(session.startTime);
        return sessionDate >= weekStart && sessionDate <= weekEnd;
      });

      const totalDuration = weekSessions.reduce((sum, session) =>
        sum + (session.summary?.totalDuration || 0), 0
      );

      const totalCalories = weekSessions.reduce((sum, session) =>
        sum + (session.summary?.estimatedCalories || 0), 0
      );

      const powerValues = weekSessions
        .map(s => s.summary?.avgMetrics['power'] || 0)
        .filter(p => p > 0);

      const avgPower = powerValues.length > 0 ?
        powerValues.reduce((sum, p) => sum + p, 0) / powerValues.length : 0;

      weeklyData.push({
        week: weekStart.toISOString().split('T')[0],
        sessions: weekSessions.length,
        duration: totalDuration,
        calories: totalCalories,
        avgPower
      });
    }

    return weeklyData;
  }

  async getPowerZones(sessions?: WorkoutSession[]): Promise<PowerZone[]> {
    const sessionsToAnalyze = sessions || await storageManager.getSessions();

    // Calculate FTP (Functional Threshold Power) as 95% of best 20-minute power
    const ftp = await this.estimateFTP(sessionsToAnalyze);

    const zones: PowerZone[] = [
      { zone: 1, name: 'Active Recovery', minPower: 0, maxPower: Math.round(ftp * 0.55), timeInZone: 0, percentage: 0 },
      { zone: 2, name: 'Endurance', minPower: Math.round(ftp * 0.56), maxPower: Math.round(ftp * 0.75), timeInZone: 0, percentage: 0 },
      { zone: 3, name: 'Tempo', minPower: Math.round(ftp * 0.76), maxPower: Math.round(ftp * 0.90), timeInZone: 0, percentage: 0 },
      { zone: 4, name: 'Lactate Threshold', minPower: Math.round(ftp * 0.91), maxPower: Math.round(ftp * 1.05), timeInZone: 0, percentage: 0 },
      { zone: 5, name: 'VO2 Max', minPower: Math.round(ftp * 1.06), maxPower: Math.round(ftp * 1.20), timeInZone: 0, percentage: 0 },
      { zone: 6, name: 'Neuromuscular', minPower: Math.round(ftp * 1.21), maxPower: 9999, timeInZone: 0, percentage: 0 }
    ];

    let totalTime = 0;

    // Analyze each session's data points
    sessionsToAnalyze.forEach(session => {
      session.dataPoints.forEach(point => {
        const power = point.metrics.power || 0;
        if (power > 0) {
          const zone = zones.find(z => power >= z.minPower && power <= z.maxPower);
          if (zone) {
            zone.timeInZone += 2; // Assuming 2-second intervals
            totalTime += 2;
          }
        }
      });
    });

    // Calculate percentages
    if (totalTime > 0) {
      zones.forEach(zone => {
        zone.percentage = (zone.timeInZone / totalTime) * 100;
      });
    }

    return zones;
  }

  async getPersonalRecords(): Promise<PersonalRecord[]> {
    return storageManager.getPersonalRecords();
  }

  async getRecentAchievements(days: number = 30): Promise<PersonalRecord[]> {
    const cutoffDate = Date.now() - (days * 24 * 60 * 60 * 1000);
    const allRecords = await this.getPersonalRecords();

    return allRecords.filter(record => record.achievedAt >= cutoffDate)
      .sort((a, b) => b.achievedAt - a.achievedAt);
  }

  private async estimateFTP(sessions: WorkoutSession[]): Promise<number> {
    // Simple FTP estimation: 95% of best 20-minute average power
    let bestPower = 0;

    sessions.forEach(session => {
      const powerValues = session.dataPoints
        .map(point => point.metrics.power || 0)
        .filter(p => p > 0);

      if (powerValues.length >= 600) { // At least 20 minutes of data (600 * 2 seconds)
        // Calculate 20-minute rolling average
        for (let i = 0; i <= powerValues.length - 600; i++) {
          const twentyMinutePowers = powerValues.slice(i, i + 600);
          const avgPower = twentyMinutePowers.reduce((sum, p) => sum + p, 0) / twentyMinutePowers.length;
          bestPower = Math.max(bestPower, avgPower);
        }
      }
    });

    return Math.round(bestPower * 0.95);
  }

  private async getSessionsInRange(timeRange?: { start: Date; end: Date }): Promise<WorkoutSession[]> {
    const allSessions = await storageManager.getSessions();

    if (!timeRange) {
      return allSessions;
    }

    return allSessions.filter(session => {
      const sessionDate = new Date(session.startTime);
      return sessionDate >= timeRange.start && sessionDate <= timeRange.end;
    });
  }

  private calculateAverage(values: number[]): number {
    const nonZeroValues = values.filter(v => v > 0);
    return nonZeroValues.length > 0 ?
      nonZeroValues.reduce((sum, v) => sum + v, 0) / nonZeroValues.length : 0;
  }

  // Fitness metrics calculations
  async calculateTrainingStress(sessions: WorkoutSession[]): Promise<number> {
    const ftp = await this.estimateFTP(sessions);
    if (ftp === 0) return 0;

    let totalTSS = 0;

    sessions.forEach(session => {
      const duration = (session.summary?.totalDuration || 0) / 1000 / 3600; // hours
      const avgPower = session.summary?.avgMetrics['power'] || 0;
      const normalizedPower = avgPower * 1.05; // Simplified NP calculation

      const intensityFactor = normalizedPower / ftp;
      const tss = (duration * normalizedPower * intensityFactor) / (ftp * 3600) * 100;

      totalTSS += tss;
    });

    return Math.round(totalTSS);
  }

  async getTrainingLoad(days: number = 7): Promise<{ acute: number; chronic: number; ratio: number }> {
    const endDate = new Date();
    const acuteStart = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));
    const chronicStart = new Date(endDate.getTime() - (days * 4 * 24 * 60 * 60 * 1000)); // 4x the acute period

    const acuteSessions = await this.getSessionsInRange({ start: acuteStart, end: endDate });
    const chronicSessions = await this.getSessionsInRange({ start: chronicStart, end: endDate });

    const acuteLoad = await this.calculateTrainingStress(acuteSessions) / days;
    const chronicLoad = await this.calculateTrainingStress(chronicSessions) / (days * 4);

    const ratio = chronicLoad > 0 ? acuteLoad / chronicLoad : 0;

    return { acute: acuteLoad, chronic: chronicLoad, ratio };
  }
}

export const performanceAnalytics = new PerformanceAnalytics();