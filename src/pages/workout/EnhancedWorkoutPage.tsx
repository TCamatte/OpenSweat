import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '@/core/storage/app-store';
import { storageManager } from '@/core/storage/local-storage-manager';
import { WorkoutPlan } from '@/types';
import { createWorkoutTemplates, getTemplatesByDifficulty } from '@/core/workout/workout-templates';
import WorkoutPlanBuilder from '@/components/workout/WorkoutPlanBuilder';
import GuidedWorkout from '@/components/workout/GuidedWorkout';

type WorkoutPageView = 'main' | 'templates' | 'builder' | 'guided' | 'myWorkouts';

export default function EnhancedWorkoutPage() {
  const { bluetooth, connectedEquipment } = useAppStore();
  const [currentView, setCurrentView] = useState<WorkoutPageView>('main');
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [templates, setTemplates] = useState<WorkoutPlan[]>([]);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutPlan | null>(null);
  const [editingWorkout, setEditingWorkout] = useState<WorkoutPlan | null>(null);

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

  const handleStartWorkout = (workout: WorkoutPlan) => {
    if (!bluetooth.isConnected) {
      const proceed = confirm(
        'No equipment connected. You can still plan and practice this workout, but you won\'t get real-time data or resistance control. Continue?'
      );
      if (!proceed) return;
    }
    setSelectedWorkout(workout);
    setCurrentView('guided');
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

  const handleWorkoutComplete = () => {
    setCurrentView('main');
    setSelectedWorkout(null);
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

  if (currentView === 'guided' && selectedWorkout) {
    return (
      <GuidedWorkout
        workoutPlan={selectedWorkout}
        onComplete={handleWorkoutComplete}
        onCancel={() => setCurrentView('main')}
      />
    );
  }

  if (currentView === 'builder') {
    return (
      <WorkoutPlanBuilder
        plan={editingWorkout || undefined}
        onSave={handleWorkoutSaved}
        onCancel={() => setCurrentView('main')}
      />
    );
  }

  // Remove the equipment connection requirement for workout planning

  const renderMainView = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Workout</h2>
        <p className="text-gray-600">Choose or create your training session</p>
      </div>

      {/* Connection Status */}
      {!bluetooth.isConnected ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <div className="text-yellow-600">⚠️</div>
            <div className="flex-1">
              <h3 className="font-medium text-yellow-900">Equipment Not Connected</h3>
              <p className="text-sm text-yellow-800">
                You can still plan workouts, but you'll need to connect equipment for live data and resistance control.
              </p>
            </div>
            <Link
              to="/connect"
              className="px-4 py-2 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700 transition-colors"
            >
              Connect
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <div className="text-green-600">✅</div>
            <div className="flex-1">
              <h3 className="font-medium text-green-900">Equipment Connected</h3>
              <p className="text-sm text-green-800">
                {bluetooth.deviceName || 'Unknown device'} is ready for your workout.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
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
          onClick={handleCreateWorkout}
          className="p-6 bg-green-50 border-2 border-green-200 rounded-xl hover:border-green-300 transition-colors"
        >
          <div className="text-center">
            <div className="text-3xl mb-2">➕</div>
            <h3 className="font-semibold text-gray-900">Create</h3>
            <p className="text-sm text-gray-600 mt-1">
              Build custom workout
            </p>
          </div>
        </button>
      </div>

      {/* My Workouts */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">My Workouts</h3>
          <span className="text-sm text-gray-500">{workoutPlans.length} workouts</span>
        </div>

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
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <button
                      onClick={() => handleStartWorkout(workout)}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Start
                    </button>
                    <button
                      onClick={() => handleEditWorkout(workout)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
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
            <p className="text-sm mt-1">Create your first workout or try a template</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderTemplatesView = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Workout Templates</h2>
          <p className="text-gray-600">Pre-built workouts for every fitness level</p>
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
                        </div>
                      </div>
                      <button
                        onClick={() => handleStartWorkout(template)}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Start
                      </button>
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

  if (currentView === 'templates') {
    return renderTemplatesView();
  }

  return renderMainView();
}