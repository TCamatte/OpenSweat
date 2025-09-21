import { useState, useEffect, useRef } from 'react';
import { WorkoutPlan } from '@/types';
import { storageManager } from '@/core/storage/local-storage-manager';
import { createWorkoutTemplates, getTemplatesByDifficulty } from '@/core/workout/workout-templates';
import WorkoutPlanBuilder from '@/components/workout/WorkoutPlanBuilder';

type PlanningView = 'main' | 'templates' | 'builder' | 'myWorkouts';

export default function PlanningPage() {
  const [currentView, setCurrentView] = useState<PlanningView>('main');
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [templates, setTemplates] = useState<WorkoutPlan[]>([]);
  const [editingWorkout, setEditingWorkout] = useState<WorkoutPlan | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadWorkouts();
    loadTemplates();
  }, []);

  const loadWorkouts = async () => {
    try {
      const userWorkouts = await storageManager.getWorkouts({ isTemplate: false });
      setWorkoutPlans(userWorkouts);
    } catch (error) {
      console.error('Failed to load workouts:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      const workoutTemplates = createWorkoutTemplates();
      setTemplates(workoutTemplates);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const handleCreateWorkout = () => {
    setEditingWorkout(null);
    setCurrentView('builder');
  };

  const handleEditWorkout = (workout: WorkoutPlan) => {
    setEditingWorkout(workout);
    setCurrentView('builder');
  };

  const handleWorkoutSaved = async (workout: WorkoutPlan) => {
    await loadWorkouts();
    setCurrentView('main');
    setEditingWorkout(null);
  };

  const handleDeleteWorkout = async (workoutId: string) => {
    if (confirm('Are you sure you want to delete this workout?')) {
      try {
        await storageManager.deleteWorkout(workoutId);
        await loadWorkouts();
      } catch (error) {
        console.error('Failed to delete workout:', error);
        alert('Failed to delete workout');
      }
    }
  };

  const handleCopyTemplate = async (template: WorkoutPlan) => {
    const newWorkout: WorkoutPlan = {
      ...template,
      id: `workout_${Date.now()}`,
      name: `${template.name} (Copy)`,
      isTemplate: false,
      createdAt: Date.now(),
      modifiedAt: Date.now()
    };

    try {
      await storageManager.saveWorkout(newWorkout);
      await loadWorkouts();
      alert('Template copied to My Workouts!');
    } catch (error) {
      console.error('Failed to copy template:', error);
      alert('Failed to copy template');
    }
  };

  const handleExportWorkouts = async () => {
    try {
      if (workoutPlans.length === 0) {
        alert('No custom workouts to export');
        return;
      }

      const exportData = {
        exportInfo: {
          exportedAt: new Date().toISOString(),
          format: 'json',
          type: 'custom-workouts',
          version: '1.0'
        },
        workouts: workoutPlans,
        count: workoutPlans.length
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `opensweat-custom-workouts-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert(`Successfully exported ${workoutPlans.length} custom workouts!`);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export workouts. Please try again.');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setImportStatus('Please select a JSON file.');
      setTimeout(() => setImportStatus(''), 3000);
      return;
    }

    setIsImporting(true);
    setImportStatus('Reading file...');

    try {
      const fileContent = await file.text();
      const data = JSON.parse(fileContent);

      // Validate the import data structure
      if (!data.exportInfo || data.exportInfo.type !== 'custom-workouts') {
        throw new Error('Invalid file format. Please select a valid custom workouts export file.');
      }

      if (!data.workouts || !Array.isArray(data.workouts)) {
        throw new Error('No valid workout data found in the file.');
      }

      setImportStatus('Importing workouts...');

      const importDate = new Date(data.exportInfo.exportedAt).toLocaleDateString();
      if (!confirm(`Import ${data.workouts.length} custom workouts from ${importDate}? This will add to your existing workouts.`)) {
        setIsImporting(false);
        setImportStatus('');
        return;
      }

      let imported = 0;
      const errors = [];

      for (const workout of data.workouts) {
        try {
          // Create a new workout with updated IDs and timestamps
          const newWorkout: WorkoutPlan = {
            ...workout,
            id: `workout_${Date.now()}_${imported}`,
            name: workout.name.endsWith('(Imported)') ? workout.name : `${workout.name} (Imported)`,
            isTemplate: false,
            createdAt: Date.now(),
            modifiedAt: Date.now()
          };

          await storageManager.saveWorkout(newWorkout);
          imported++;
        } catch (error) {
          errors.push(`Failed to import "${workout.name}": ${error}`);
        }
      }

      await loadWorkouts();

      if (imported > 0) {
        setImportStatus(`Successfully imported ${imported} workouts!`);
      } else {
        setImportStatus('No workouts were imported.');
      }

      if (errors.length > 0) {
        console.error('Import errors:', errors);
        alert(`Import completed with errors. ${imported} workouts imported, ${errors.length} failed.`);
      }
    } catch (error) {
      console.error('Import failed:', error);
      setImportStatus(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsImporting(false);
      setTimeout(() => setImportStatus(''), 5000);

      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  };

  const getDifficultyColor = (difficulty: number): string => {
    const colors = {
      1: 'bg-green-100 text-green-800',
      2: 'bg-blue-100 text-blue-800',
      3: 'bg-yellow-100 text-yellow-800',
      4: 'bg-orange-100 text-orange-800',
      5: 'bg-red-100 text-red-800'
    };
    return colors[difficulty as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getDifficultyLabel = (difficulty: number): string => {
    const labels = {
      1: 'Beginner',
      2: 'Easy',
      3: 'Moderate',
      4: 'Hard',
      5: 'Expert'
    };
    return labels[difficulty as keyof typeof labels] || 'Unknown';
  };

  if (currentView === 'builder') {
    return (
      <WorkoutPlanBuilder
        plan={editingWorkout || undefined}
        onSave={handleWorkoutSaved}
        onCancel={() => setCurrentView('main')}
      />
    );
  }

  const renderMainView = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Workout Planning</h2>
        <p className="text-gray-600">Create and manage your workout plans - no equipment required</p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-center space-x-3">
          <div className="text-blue-600">💡</div>
          <div>
            <h3 className="font-medium text-blue-900">Plan Anywhere</h3>
            <p className="text-sm text-blue-800">
              Create and edit workout plans without connecting any equipment. Perfect for planning your training schedule offline.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={handleCreateWorkout}
          className="p-6 bg-green-50 border-2 border-green-200 rounded-xl hover:border-green-300 transition-colors"
        >
          <div className="text-center">
            <div className="text-3xl mb-2">➕</div>
            <h3 className="font-semibold text-gray-900">Create New</h3>
            <p className="text-sm text-gray-600 mt-1">
              Build a custom workout from scratch
            </p>
          </div>
        </button>

        <button
          onClick={() => setCurrentView('templates')}
          className="p-6 bg-blue-50 border-2 border-blue-200 rounded-xl hover:border-blue-300 transition-colors"
        >
          <div className="text-center">
            <div className="text-3xl mb-2">📋</div>
            <h3 className="font-semibold text-gray-900">Templates</h3>
            <p className="text-sm text-gray-600 mt-1">
              {templates.length} ready-to-use workouts
            </p>
          </div>
        </button>

        <button
          onClick={() => setCurrentView('myWorkouts')}
          className="p-6 bg-purple-50 border-2 border-purple-200 rounded-xl hover:border-purple-300 transition-colors"
        >
          <div className="text-center">
            <div className="text-3xl mb-2">📚</div>
            <h3 className="font-semibold text-gray-900">My Workouts</h3>
            <p className="text-sm text-gray-600 mt-1">
              {workoutPlans.length} custom workouts
            </p>
          </div>
        </button>
      </div>

      {/* Recent Workouts */}
      {workoutPlans.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Workouts</h3>
            <button
              onClick={() => setCurrentView('myWorkouts')}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              View All →
            </button>
          </div>

          <div className="space-y-3">
            {workoutPlans.slice(0, 3).map((workout) => (
              <div
                key={workout.id}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-medium text-gray-900">{workout.name}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${getDifficultyColor(workout.difficulty)}`}>
                        {getDifficultyLabel(workout.difficulty)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>{formatDuration(workout.totalDuration)}</span>
                      <span>{workout.steps.length} steps</span>
                      <span className="capitalize">{workout.equipmentType}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleEditWorkout(workout)}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderTemplatesView = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Workout Templates</h2>
          <p className="text-gray-600">Pre-built workouts you can copy and customize</p>
        </div>
        <button
          onClick={() => setCurrentView('main')}
          className="px-4 py-2 text-gray-600 hover:text-gray-800"
        >
          ← Back
        </button>
      </div>

      {/* Difficulty Filter */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <h3 className="font-medium text-gray-900 mb-3">Browse by Difficulty</h3>
        <div className="grid grid-cols-1 gap-3">
          {[1, 2, 3, 4, 5].map((difficulty) => {
            const templatesForDifficulty = getTemplatesByDifficulty(difficulty);
            return (
              <div key={difficulty} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 text-sm rounded-full ${getDifficultyColor(difficulty)}`}>
                      {getDifficultyLabel(difficulty)}
                    </span>
                    <span className="text-sm text-gray-600">
                      {templatesForDifficulty.length} workouts
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  {templatesForDifficulty.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{template.name}</h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                          <span>{formatDuration(template.totalDuration)}</span>
                          <span>{template.steps.length} steps</span>
                          <span className="capitalize">{template.equipmentType}</span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleCopyTemplate(template)}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                        >
                          Copy
                        </button>
                        <button
                          onClick={() => handleEditWorkout(template)}
                          className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 transition-colors"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderMyWorkoutsView = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Workouts</h2>
          <p className="text-gray-600">Your custom workout collection</p>
        </div>
        <button
          onClick={() => setCurrentView('main')}
          className="px-4 py-2 text-gray-600 hover:text-gray-800"
        >
          ← Back
        </button>
      </div>

      {/* Export/Import Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <div className="text-blue-600">💡</div>
          <div>
            <h3 className="font-medium text-blue-900">Export & Import Your Workouts</h3>
            <p className="text-sm text-blue-800 mt-1">
              Export your custom workouts to share with friends or back them up. Import workouts from JSON files to expand your collection.
            </p>
            <ul className="text-xs text-blue-700 mt-2 space-y-1">
              <li>• Export creates a JSON file with all your custom workouts</li>
              <li>• Import adds workouts to your collection (doesn't replace existing ones)</li>
              <li>• Imported workouts are marked with "(Imported)" suffix</li>
            </ul>
          </div>
        </div>
      </div>

      {/* My Workouts List */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Custom Workouts ({workoutPlans.length})
          </h3>
          <div className="flex space-x-2">
            <button
              onClick={handleImportClick}
              disabled={isImporting}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isImporting ? 'Importing...' : 'Import'}
            </button>
            <button
              onClick={handleExportWorkouts}
              disabled={workoutPlans.length === 0}
              className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Export
            </button>
            <button
              onClick={handleCreateWorkout}
              className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
            >
              Create New
            </button>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Import Status */}
        {importStatus && (
          <div className={`mb-4 p-3 rounded-lg ${
            importStatus.includes('failed') || importStatus.includes('error') ? 'bg-red-50 text-red-800' :
            importStatus.includes('Successfully') ? 'bg-green-50 text-green-800' :
            'bg-blue-50 text-blue-800'
          }`}>
            {importStatus}
          </div>
        )}

        {workoutPlans.length > 0 ? (
          <div className="space-y-3">
            {workoutPlans.map((workout) => (
              <div
                key={workout.id}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-medium text-gray-900">{workout.name}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${getDifficultyColor(workout.difficulty)}`}>
                        {getDifficultyLabel(workout.difficulty)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {workout.description || 'No description'}
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>{formatDuration(workout.totalDuration)}</span>
                      <span>{workout.steps.length} steps</span>
                      <span className="capitalize">{workout.equipmentType}</span>
                      <span>Modified {new Date(workout.modifiedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <button
                      onClick={() => handleEditWorkout(workout)}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteWorkout(workout.id)}
                      className="px-4 py-2 bg-red-100 text-red-700 text-sm rounded-lg hover:bg-red-200 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📝</div>
            <p>No custom workouts yet</p>
            <p className="text-sm mt-1">Create your first workout or copy a template</p>
            <button
              onClick={handleCreateWorkout}
              className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Create First Workout
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {currentView === 'main' && renderMainView()}
      {currentView === 'templates' && renderTemplatesView()}
      {currentView === 'myWorkouts' && renderMyWorkoutsView()}
    </div>
  );
}