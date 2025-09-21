import { useState } from 'react';
import { WorkoutPlan, WorkoutStep, EquipmentType } from '@/types';
import { storageManager } from '@/core/storage/local-storage-manager';
import WorkoutStepEditor from './WorkoutStepEditor';

interface WorkoutPlanBuilderProps {
  plan?: WorkoutPlan;
  onSave: (plan: WorkoutPlan) => void;
  onCancel: () => void;
}

export default function WorkoutPlanBuilder({
  plan,
  onSave,
  onCancel
}: WorkoutPlanBuilderProps) {
  const [formData, setFormData] = useState<Partial<WorkoutPlan>>({
    id: plan?.id || `workout_${Date.now()}`,
    name: plan?.name || '',
    description: plan?.description || '',
    equipmentType: plan?.equipmentType || 'bike',
    difficulty: plan?.difficulty || 3,
    tags: plan?.tags || [],
    isTemplate: plan?.isTemplate || false,
    steps: plan?.steps || [],
    totalDuration: plan?.totalDuration || 0,
    createdAt: plan?.createdAt || Date.now(),
    modifiedAt: Date.now()
  });

  const [editingStep, setEditingStep] = useState<WorkoutStep | null>(null);
  const [editingStepIndex, setEditingStepIndex] = useState<number>(-1);
  const [showStepEditor, setShowStepEditor] = useState(false);
  const [newTag, setNewTag] = useState('');

  const equipmentTypes: { value: EquipmentType; label: string; icon: string }[] = [
    { value: 'bike', label: 'Indoor Bike', icon: '🚴' },
    { value: 'treadmill', label: 'Treadmill', icon: '🏃' },
    { value: 'rower', label: 'Rowing Machine', icon: '🚣' }
  ];

  const difficultyLevels = [
    { value: 1, label: 'Beginner', color: 'bg-green-100 text-green-800' },
    { value: 2, label: 'Easy', color: 'bg-blue-100 text-blue-800' },
    { value: 3, label: 'Moderate', color: 'bg-yellow-100 text-yellow-800' },
    { value: 4, label: 'Hard', color: 'bg-orange-100 text-orange-800' },
    { value: 5, label: 'Expert', color: 'bg-red-100 text-red-800' }
  ];

  const handleAddStep = () => {
    setEditingStep(null);
    setEditingStepIndex(-1);
    setShowStepEditor(true);
  };

  const handleEditStep = (step: WorkoutStep, index: number) => {
    setEditingStep(step);
    setEditingStepIndex(index);
    setShowStepEditor(true);
  };

  const handleSaveStep = (step: WorkoutStep) => {
    const updatedSteps = [...(formData.steps || [])];

    if (editingStepIndex >= 0) {
      updatedSteps[editingStepIndex] = step;
    } else {
      updatedSteps.push(step);
    }

    const totalDuration = updatedSteps.reduce((sum, s) => sum + s.duration, 0);

    setFormData({
      ...formData,
      steps: updatedSteps,
      totalDuration
    });

    setShowStepEditor(false);
    setEditingStep(null);
    setEditingStepIndex(-1);
  };

  const handleDeleteStep = (index: number) => {
    const updatedSteps = formData.steps?.filter((_, i) => i !== index) || [];
    const totalDuration = updatedSteps.reduce((sum, s) => sum + s.duration, 0);

    setFormData({
      ...formData,
      steps: updatedSteps,
      totalDuration
    });
  };

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    const steps = [...(formData.steps || [])];
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex >= 0 && newIndex < steps.length) {
      [steps[index], steps[newIndex]] = [steps[newIndex], steps[index]];
      setFormData({ ...formData, steps });
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), newTag.trim()]
      });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter(t => t !== tag) || []
    });
  };

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      alert('Please enter a workout name');
      return;
    }

    if (!formData.steps || formData.steps.length === 0) {
      alert('Please add at least one step to the workout');
      return;
    }

    const workoutPlan: WorkoutPlan = {
      id: formData.id!,
      name: formData.name.trim(),
      description: formData.description || '',
      equipmentType: formData.equipmentType!,
      steps: formData.steps,
      totalDuration: formData.totalDuration!,
      difficulty: formData.difficulty!,
      tags: formData.tags || [],
      isTemplate: formData.isTemplate!,
      createdAt: formData.createdAt!,
      modifiedAt: Date.now()
    };

    try {
      await storageManager.saveWorkout(workoutPlan);
      onSave(workoutPlan);
    } catch (error) {
      console.error('Failed to save workout:', error);
      alert('Failed to save workout. Please try again.');
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

  const getStepTypeColor = (type: string): string => {
    const colors = {
      warmup: 'bg-green-100 text-green-800',
      steady: 'bg-blue-100 text-blue-800',
      interval: 'bg-red-100 text-red-800',
      recovery: 'bg-yellow-100 text-yellow-800',
      cooldown: 'bg-purple-100 text-purple-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Workout Details
        </h3>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Workout Name *
            </label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter workout name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe this workout..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Equipment Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Equipment Type
            </label>
            <div className="grid grid-cols-1 gap-2">
              {equipmentTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setFormData({ ...formData, equipmentType: type.value })}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    formData.equipmentType === type.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{type.icon}</span>
                    <span className="font-medium text-gray-900">{type.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Difficulty Level
            </label>
            <div className="flex space-x-2">
              {difficultyLevels.map((level) => (
                <button
                  key={level.value}
                  onClick={() => setFormData({ ...formData, difficulty: level.value as any })}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    formData.difficulty === level.value
                      ? level.color
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {level.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags?.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex space-x-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                placeholder="Add tag"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleAddTag}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Workout Steps */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Workout Steps ({formData.steps?.length || 0})
          </h3>
          <div className="text-sm text-gray-600">
            Total: {formatDuration(formData.totalDuration || 0)}
          </div>
        </div>

        {formData.steps && formData.steps.length > 0 ? (
          <div className="space-y-3 mb-4">
            {formData.steps.map((step, index) => (
              <div
                key={step.id}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-sm font-medium text-gray-500">
                        #{index + 1}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStepTypeColor(step.type)}`}>
                        {step.type}
                      </span>
                      <span className="font-medium text-gray-900">
                        {step.name || `Step ${index + 1}`}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Duration: {formatDuration(step.duration)} •
                      Resistance: {step.targetMetrics.resistance || 0}% •
                      Cadence: {step.targetMetrics.cadence || 0} rpm
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleMoveStep(index, 'up')}
                      disabled={index === 0}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => handleMoveStep(index, 'down')}
                      disabled={index === formData.steps!.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => handleEditStep(step, index)}
                      className="p-1 text-blue-600 hover:text-blue-800"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDeleteStep(index)}
                      className="p-1 text-red-600 hover:text-red-800"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📝</div>
            <p>No steps added yet</p>
            <p className="text-sm">Add your first workout step below</p>
          </div>
        )}

        <button
          onClick={handleAddStep}
          className="w-full py-3 border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-blue-400 hover:text-blue-600 transition-colors"
        >
          + Add Step
        </button>
      </div>

      {/* Actions */}
      <div className="flex space-x-4">
        <button
          onClick={onCancel}
          className="flex-1 py-3 px-6 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="flex-1 py-3 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {plan ? 'Update' : 'Create'} Workout
        </button>
      </div>

      {/* Step Editor Modal */}
      {showStepEditor && (
        <WorkoutStepEditor
          step={editingStep || undefined}
          stepNumber={(editingStepIndex >= 0 ? editingStepIndex : formData.steps?.length || 0) + 1}
          onSave={handleSaveStep}
          onCancel={() => {
            setShowStepEditor(false);
            setEditingStep(null);
            setEditingStepIndex(-1);
          }}
        />
      )}
    </div>
  );
}