import { useState } from 'react';
import { storageManager } from '@/core/storage/local-storage-manager';
import { performanceAnalytics } from '@/core/analytics/performance-analytics';
import { WorkoutSession, PersonalRecord } from '@/types';

interface ExportOptions {
  format: 'json' | 'csv' | 'tcx' | 'gpx';
  dataType: 'sessions' | 'records' | 'analytics' | 'all';
  timeRange: 'week' | 'month' | 'year' | 'all';
  includeRawData: boolean;
}

export default function DataExport() {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'json',
    dataType: 'sessions',
    timeRange: 'month',
    includeRawData: false
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string>('');

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setExportStatus('Preparing data...');

      const data = await prepareExportData();
      const filename = generateFilename();

      if (exportOptions.format === 'json') {
        downloadJSON(data, filename);
      } else if (exportOptions.format === 'csv') {
        downloadCSV(data, filename);
      } else if (exportOptions.format === 'tcx') {
        downloadTCX(data, filename);
      } else if (exportOptions.format === 'gpx') {
        downloadGPX(data, filename);
      }

      setExportStatus('Export completed successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      setExportStatus('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportStatus(''), 3000);
    }
  };

  const prepareExportData = async () => {
    const timeRange = getTimeRange();
    let data: any = {};

    if (exportOptions.dataType === 'sessions' || exportOptions.dataType === 'all') {
      setExportStatus('Loading workout sessions...');
      const sessions = await getSessionsInRange(timeRange);
      data.sessions = exportOptions.includeRawData ?
        sessions : sessions.map(simplifySession);
    }

    if (exportOptions.dataType === 'records' || exportOptions.dataType === 'all') {
      setExportStatus('Loading personal records...');
      const records = await storageManager.getPersonalRecords();
      data.personalRecords = filterRecordsByTimeRange(records, timeRange);
    }

    if (exportOptions.dataType === 'analytics' || exportOptions.dataType === 'all') {
      setExportStatus('Calculating analytics...');
      const analytics = await performanceAnalytics.getOverallStats(timeRange);
      const powerTrend = await performanceAnalytics.getPowerTrend(
        timeRange ? Math.ceil((timeRange.end.getTime() - timeRange.start.getTime()) / (24 * 60 * 60 * 1000)) : 365
      );
      const weeklyProgress = await performanceAnalytics.getWeeklyProgress(12);
      const powerZones = await performanceAnalytics.getPowerZones();

      data.analytics = {
        overallStats: analytics,
        powerTrend,
        weeklyProgress,
        powerZones
      };
    }

    data.exportInfo = {
      exportedAt: new Date().toISOString(),
      timeRange: exportOptions.timeRange,
      format: exportOptions.format,
      includeRawData: exportOptions.includeRawData,
      version: '1.0'
    };

    return data;
  };

  const getTimeRange = (): { start: Date; end: Date } | undefined => {
    if (exportOptions.timeRange === 'all') return undefined;

    const now = new Date();
    let days: number;

    switch (exportOptions.timeRange) {
      case 'week': days = 7; break;
      case 'month': days = 30; break;
      case 'year': days = 365; break;
      default: return undefined;
    }

    return {
      start: new Date(now.getTime() - (days * 24 * 60 * 60 * 1000)),
      end: now
    };
  };

  const getSessionsInRange = async (timeRange?: { start: Date; end: Date }): Promise<WorkoutSession[]> => {
    const allSessions = await storageManager.getSessions();

    if (!timeRange) return allSessions;

    return allSessions.filter(session => {
      const sessionDate = new Date(session.startTime);
      return sessionDate >= timeRange.start && sessionDate <= timeRange.end;
    });
  };

  const filterRecordsByTimeRange = (records: PersonalRecord[], timeRange?: { start: Date; end: Date }): PersonalRecord[] => {
    if (!timeRange) return records;

    return records.filter(record => {
      const recordDate = new Date(record.achievedAt);
      return recordDate >= timeRange.start && recordDate <= timeRange.end;
    });
  };

  const simplifySession = (session: WorkoutSession) => ({
    id: session.id,
    startTime: session.startTime,
    endTime: session.endTime,
    workoutName: session.workoutName,
    summary: session.summary,
    equipmentId: session.equipmentId
  });

  const generateFilename = (): string => {
    const timestamp = new Date().toISOString().split('T')[0];
    const dataType = exportOptions.dataType;
    const timeRange = exportOptions.timeRange;
    return `opensweat-${dataType}-${timeRange}-${timestamp}`;
  };

  const downloadJSON = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `${filename}.json`);
  };

  const downloadCSV = (data: any, filename: string) => {
    let csvContent = '';

    if (data.sessions) {
      csvContent += 'WORKOUT SESSIONS\n';
      csvContent += 'Date,Duration (min),Calories,Avg Power (W),Max Power (W),Avg Cadence,Max Cadence,Avg Heart Rate,Max Heart Rate\n';

      data.sessions.forEach((session: any) => {
        const date = new Date(session.startTime).toLocaleDateString();
        const duration = session.summary ? Math.round(session.summary.totalDuration / 60000) : 0;
        const calories = session.summary?.estimatedCalories || 0;
        const avgPower = Math.round(session.summary?.avgMetrics.power || 0);
        const maxPower = Math.round(session.summary?.maxMetrics.power || 0);
        const avgCadence = Math.round(session.summary?.avgMetrics.cadence || 0);
        const maxCadence = Math.round(session.summary?.maxMetrics.cadence || 0);
        const avgHR = Math.round(session.summary?.avgMetrics.heartRate || 0);
        const maxHR = Math.round(session.summary?.maxMetrics.heartRate || 0);

        csvContent += `${date},${duration},${calories},${avgPower},${maxPower},${avgCadence},${maxCadence},${avgHR},${maxHR}\n`;
      });
      csvContent += '\n';
    }

    if (data.personalRecords) {
      csvContent += 'PERSONAL RECORDS\n';
      csvContent += 'Metric,Value,Unit,Achieved Date\n';

      data.personalRecords.forEach((record: PersonalRecord) => {
        const date = new Date(record.achievedAt).toLocaleDateString();
        const unit = getMetricUnit(record.metricType);
        csvContent += `${record.metricType},${record.value},${unit},${date}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    downloadBlob(blob, `${filename}.csv`);
  };

  const downloadTCX = (data: any, filename: string) => {
    if (!data.sessions || data.sessions.length === 0) {
      throw new Error('No session data available for TCX export');
    }

    let tcxContent = `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">
  <Activities>`;

    data.sessions.forEach((session: WorkoutSession) => {
      if (!session.dataPoints || session.dataPoints.length === 0) return;

      const startTime = new Date(session.startTime).toISOString();
      const sport = 'Biking'; // Default to biking for now

      tcxContent += `
    <Activity Sport="${sport}">
      <Id>${startTime}</Id>
      <Lap StartTime="${startTime}">
        <TotalTimeSeconds>${(session.summary?.totalDuration || 0) / 1000}</TotalTimeSeconds>
        <Calories>${session.summary?.estimatedCalories || 0}</Calories>
        <AverageHeartRateBpm><Value>${Math.round(session.summary?.avgMetrics.heartRate || 0)}</Value></AverageHeartRateBpm>
        <MaximumHeartRateBpm><Value>${Math.round(session.summary?.maxMetrics.heartRate || 0)}</Value></MaximumHeartRateBpm>
        <Track>`;

      session.dataPoints.forEach((point, index) => {
        const pointTime = new Date(session.startTime + (index * 2000)).toISOString();
        tcxContent += `
          <Trackpoint>
            <Time>${pointTime}</Time>
            <HeartRateBpm><Value>${Math.round(point.metrics.heartRate || 0)}</Value></HeartRateBpm>
            <Cadence>${Math.round(point.metrics.cadence || 0)}</Cadence>
            <Extensions>
              <TPX xmlns="http://www.garmin.com/xmlschemas/ActivityExtension/v2">
                <Watts>${Math.round(point.metrics.power || 0)}</Watts>
              </TPX>
            </Extensions>
          </Trackpoint>`;
      });

      tcxContent += `
        </Track>
      </Lap>
    </Activity>`;
    });

    tcxContent += `
  </Activities>
</TrainingCenterDatabase>`;

    const blob = new Blob([tcxContent], { type: 'application/xml' });
    downloadBlob(blob, `${filename}.tcx`);
  };

  const downloadGPX = (data: any, filename: string) => {
    // GPX is primarily for GPS data, but we can create a basic structure
    let gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="OpenSweat">
  <metadata>
    <name>OpenSweat Workout Data</name>
    <time>${new Date().toISOString()}</time>
  </metadata>`;

    if (data.sessions) {
      data.sessions.forEach((session: WorkoutSession, sessionIndex: number) => {
        gpxContent += `
  <trk>
    <name>Workout ${sessionIndex + 1} - ${new Date(session.startTime).toLocaleDateString()}</name>
    <trkseg>`;

        if (session.dataPoints) {
          session.dataPoints.forEach((point, index) => {
            const time = new Date(session.startTime + (index * 2000)).toISOString();
            // Since we don't have GPS data, we'll use power as elevation
            gpxContent += `
      <trkpt lat="0" lon="0">
        <ele>${point.metrics.power || 0}</ele>
        <time>${time}</time>
        <extensions>
          <power>${point.metrics.power || 0}</power>
          <cadence>${point.metrics.cadence || 0}</cadence>
          <heartrate>${point.metrics.heartRate || 0}</heartrate>
        </extensions>
      </trkpt>`;
          });
        }

        gpxContent += `
    </trkseg>
  </trk>`;
      });
    }

    gpxContent += `
</gpx>`;

    const blob = new Blob([gpxContent], { type: 'application/xml' });
    downloadBlob(blob, `${filename}.gpx`);
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getMetricUnit = (metricType: string): string => {
    const units: Record<string, string> = {
      power: 'W',
      cadence: 'rpm',
      speed: 'km/h',
      heartRate: 'bpm',
      distance: 'm',
      calories: 'kcal'
    };
    return units[metricType] || '';
  };

  const getDataTypeDescription = (dataType: string): string => {
    const descriptions: Record<string, string> = {
      sessions: 'Workout sessions with performance metrics',
      records: 'Personal records and achievements',
      analytics: 'Performance analytics and trends',
      all: 'Complete data including sessions, records, and analytics'
    };
    return descriptions[dataType] || '';
  };

  const getFormatDescription = (format: string): string => {
    const descriptions: Record<string, string> = {
      json: 'JSON format for data analysis and backup',
      csv: 'CSV format for spreadsheet applications',
      tcx: 'TCX format compatible with Garmin and other fitness apps',
      gpx: 'GPX format for basic workout tracking'
    };
    return descriptions[format] || '';
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Export Data</h2>

      <div className="space-y-6">
        {/* Export Format */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Export Format
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {['json', 'csv', 'tcx', 'gpx'].map(format => (
              <label key={format} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="format"
                  value={format}
                  checked={exportOptions.format === format}
                  onChange={(e) => setExportOptions({ ...exportOptions, format: e.target.value as any })}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="font-medium text-gray-900">{format.toUpperCase()}</div>
                  <div className="text-sm text-gray-600">{getFormatDescription(format)}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Data Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data to Export
          </label>
          <div className="space-y-2">
            {['sessions', 'records', 'analytics', 'all'].map(dataType => (
              <label key={dataType} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="dataType"
                  value={dataType}
                  checked={exportOptions.dataType === dataType}
                  onChange={(e) => setExportOptions({ ...exportOptions, dataType: e.target.value as any })}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="font-medium text-gray-900 capitalize">{dataType}</div>
                  <div className="text-sm text-gray-600">{getDataTypeDescription(dataType)}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Time Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Time Range
          </label>
          <select
            value={exportOptions.timeRange}
            onChange={(e) => setExportOptions({ ...exportOptions, timeRange: e.target.value as any })}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="year">Last Year</option>
            <option value="all">All Time</option>
          </select>
        </div>

        {/* Include Raw Data */}
        {(exportOptions.dataType === 'sessions' || exportOptions.dataType === 'all') && (
          <div>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={exportOptions.includeRawData}
                onChange={(e) => setExportOptions({ ...exportOptions, includeRawData: e.target.checked })}
                className="text-blue-600 focus:ring-blue-500"
              />
              <div>
                <div className="font-medium text-gray-900">Include Raw Data Points</div>
                <div className="text-sm text-gray-600">
                  Include all data points from workout sessions (larger file size)
                </div>
              </div>
            </label>
          </div>
        )}

        {/* Export Status */}
        {exportStatus && (
          <div className={`p-3 rounded-lg ${
            exportStatus.includes('failed') ? 'bg-red-50 text-red-800' :
            exportStatus.includes('completed') ? 'bg-green-50 text-green-800' :
            'bg-blue-50 text-blue-800'
          }`}>
            {exportStatus}
          </div>
        )}

        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {isExporting ? 'Exporting...' : 'Export Data'}
        </button>

        {/* Export Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Export Information</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p>• Format: {exportOptions.format.toUpperCase()}</p>
            <p>• Data: {exportOptions.dataType}</p>
            <p>• Time Range: {exportOptions.timeRange}</p>
            {exportOptions.includeRawData && <p>• Including raw data points</p>}
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <span className="text-blue-600 text-lg">🔒</span>
            <div>
              <h4 className="font-medium text-blue-900">Privacy & Data</h4>
              <p className="text-sm text-blue-800">
                All data is exported directly from your device. No data is sent to external servers.
                Your exported files contain only the workout data you've generated locally.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}