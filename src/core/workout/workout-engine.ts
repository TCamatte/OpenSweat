import {
  WorkoutPlan,
  WorkoutStep,
  WorkoutSession,
  MetricDataPoint,
  EquipmentProfile
} from '@/types';
import { deviceManager } from '@/core/bluetooth/device-manager';
import { sessionRecorder } from './session-recorder';

export interface WorkoutEngineState {
  isActive: boolean;
  currentStepIndex: number;
  stepStartTime: number;
  stepElapsedTime: number;
  totalElapsedTime: number;
  workoutStartTime: number;
  currentStep: WorkoutStep | null;
  nextStep: WorkoutStep | null;
  workoutPlan: WorkoutPlan | null;
  sessionId: string | null;
}

export interface WorkoutEngineCallbacks {
  onStepChange?: (currentStep: WorkoutStep, stepIndex: number) => void;
  onWorkoutComplete?: (session: WorkoutSession) => void;
  onWorkoutPaused?: () => void;
  onWorkoutResumed?: () => void;
  onTargetUpdate?: (targets: Record<string, number>) => void;
  onProgress?: (progress: { stepProgress: number; totalProgress: number }) => void;
}

export class WorkoutEngine {
  private state: WorkoutEngineState = {
    isActive: false,
    currentStepIndex: 0,
    stepStartTime: 0,
    stepElapsedTime: 0,
    totalElapsedTime: 0,
    workoutStartTime: 0,
    currentStep: null,
    nextStep: null,
    workoutPlan: null,
    sessionId: null
  };

  private callbacks: WorkoutEngineCallbacks = {};
  private updateInterval: number | null = null;
  private autoResistanceControl = true;

  constructor(callbacks: WorkoutEngineCallbacks = {}) {
    this.callbacks = callbacks;
  }

  async startWorkout(
    workoutPlan: WorkoutPlan,
    equipment: EquipmentProfile | null,
    autoControl = true
  ): Promise<void> {
    if (this.state.isActive) {
      throw new Error('Workout is already active');
    }

    if (!workoutPlan.steps || workoutPlan.steps.length === 0) {
      throw new Error('Workout plan has no steps');
    }

    // Start session recording
    const sessionId = await sessionRecorder.startSession(workoutPlan, equipment);

      console.log("session started");
    // Initialize state
    const now = Date.now();
    this.state = {
      isActive: true,
      currentStepIndex: 0,
      stepStartTime: now,
      stepElapsedTime: 0,
      totalElapsedTime: 0,
      workoutStartTime: now,
      currentStep: workoutPlan.steps[0],
      nextStep: workoutPlan.steps.length > 1 ? workoutPlan.steps[1] : null,
      workoutPlan,
      sessionId
    };

    this.autoResistanceControl = autoControl;

    // Start device workout control
    if (deviceManager.isConnected()) {
      console.log("will do deviceManager.startWorkout");
      await deviceManager.startWorkout();
      console.log("deviceManager.startWorkout");
    }

    // Apply first step targets
      console.log("will do applyStepTargets");
    await this.applyStepTargets(this.state.currentStep);

    // Start update loop
      console.log("will do startUpdateLoop");
    this.startUpdateLoop();

    // Notify callbacks
    if (this.callbacks.onStepChange) {
      this.callbacks.onStepChange(this.state.currentStep, this.state.currentStepIndex);
    }

    console.log('Workout started:', workoutPlan.name);
  }

  async pauseWorkout(): Promise<void> {
    if (!this.state.isActive) {
      throw new Error('No active workout to pause');
    }

    this.state.isActive = false;
    this.stopUpdateLoop();

    // Pause session recording
    await sessionRecorder.pauseSession();

    if (this.callbacks.onWorkoutPaused) {
      this.callbacks.onWorkoutPaused();
    }

    console.log('Workout paused');
  }

  async resumeWorkout(): Promise<void> {
    if (this.state.isActive || !this.state.workoutPlan) {
      throw new Error('No paused workout to resume');
    }

    this.state.isActive = true;
    this.state.stepStartTime = Date.now() - this.state.stepElapsedTime;

    // Resume session recording
    await sessionRecorder.resumeSession();

    // Restart update loop
    this.startUpdateLoop();

    if (this.callbacks.onWorkoutResumed) {
      this.callbacks.onWorkoutResumed();
    }

    console.log('Workout resumed');
  }

  async stopWorkout(): Promise<WorkoutSession | null> {
    if (!this.state.workoutPlan) {
      return null;
    }

    this.state.isActive = false;
    this.stopUpdateLoop();

    // Stop device workout control
    if (deviceManager.isConnected()) {
      await deviceManager.stopWorkout();
    }

    // Complete session recording
    const session = await sessionRecorder.stopSession();

    // Reset state
    this.resetState();

    if (this.callbacks.onWorkoutComplete) {
      this.callbacks.onWorkoutComplete(session);
    }

    console.log('Workout stopped');
    return session;
  }

  async nextStep(): Promise<void> {
    if (!this.state.isActive || !this.state.workoutPlan) {
      return;
    }

    const nextIndex = this.state.currentStepIndex + 1;
    if (nextIndex >= this.state.workoutPlan.steps.length) {
      // Workout complete
      await this.stopWorkout();
      return;
    }

    await this.moveToStep(nextIndex);
  }

  async previousStep(): Promise<void> {
    if (!this.state.isActive || !this.state.workoutPlan) {
      return;
    }

    const prevIndex = this.state.currentStepIndex - 1;
    if (prevIndex < 0) {
      return;
    }

    await this.moveToStep(prevIndex);
  }

  async skipToStep(stepIndex: number): Promise<void> {
    if (!this.state.isActive || !this.state.workoutPlan) {
      return;
    }

    if (stepIndex < 0 || stepIndex >= this.state.workoutPlan.steps.length) {
      throw new Error('Invalid step index');
    }

    await this.moveToStep(stepIndex);
  }

  private async moveToStep(stepIndex: number): Promise<void> {
    if (!this.state.workoutPlan) return;

    const step = this.state.workoutPlan.steps[stepIndex];
    const nextStep = stepIndex + 1 < this.state.workoutPlan.steps.length
      ? this.state.workoutPlan.steps[stepIndex + 1]
      : null;

    const now = Date.now();
    this.state.currentStepIndex = stepIndex;
    this.state.currentStep = step;
    this.state.nextStep = nextStep;
    this.state.stepStartTime = now;
    this.state.stepElapsedTime = 0;

    // Apply new step targets
    await this.applyStepTargets(step);

    // Notify callbacks
    if (this.callbacks.onStepChange) {
      this.callbacks.onStepChange(step, stepIndex);
    }

    console.log(`Moved to step ${stepIndex + 1}: ${step.name || step.type}`);
  }

  private async applyStepTargets(step: WorkoutStep): Promise<void> {
    console.log('Applying step targets:', {
      isConnected: deviceManager.isConnected(),
      autoResistanceControl: this.autoResistanceControl,
      targetMetrics: step.targetMetrics
    });

    if (!deviceManager.isConnected() || !this.autoResistanceControl) {
      console.log('Skipping target application: device not connected or auto control disabled');
      return;
    }

    try {
      // Set resistance if specified
      if (step.targetMetrics.resistance !== undefined) {
        console.log(`Setting resistance to ${step.targetMetrics.resistance}%`);
        await deviceManager.setResistance(step.targetMetrics.resistance);
        console.log(`Resistance set successfully to ${step.targetMetrics.resistance}%`);
      }

      // Set target power if specified
      if (step.targetMetrics.power !== undefined) {
        console.log(`Setting target power to ${step.targetMetrics.power}W`);
        await deviceManager.setTargetPower(step.targetMetrics.power);
        console.log(`Target power set successfully to ${step.targetMetrics.power}W`);
      }

      // Notify callbacks about target update
      if (this.callbacks.onTargetUpdate) {
        this.callbacks.onTargetUpdate(step.targetMetrics);
      }
    } catch (error) {
      console.error('Failed to apply step targets:', error);
    }
  }

  private startUpdateLoop(): void {
    this.updateInterval = window.setInterval(() => {
      this.updateTimers();
      this.checkStepCompletion();
      this.updateProgress();
    }, 1000); // Update every second
  }

  private stopUpdateLoop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  private updateTimers(): void {
    if (!this.state.isActive) return;

    const now = Date.now();
    this.state.stepElapsedTime = now - this.state.stepStartTime;
    this.state.totalElapsedTime = now - this.state.workoutStartTime;
  }

  private async checkStepCompletion(): Promise<void> {
    if (!this.state.currentStep || !this.state.isActive) return;

    const stepDurationMs = this.state.currentStep.duration * 1000;

    if (this.state.stepElapsedTime >= stepDurationMs) {
      await this.nextStep();
    }
  }

  private updateProgress(): void {
    if (!this.state.currentStep || !this.state.workoutPlan) return;

    const stepProgress = Math.min(
      this.state.stepElapsedTime / (this.state.currentStep.duration * 1000),
      1
    );

    const totalProgress = Math.min(
      this.state.totalElapsedTime / (this.state.workoutPlan.totalDuration * 1000),
      1
    );

    if (this.callbacks.onProgress) {
      this.callbacks.onProgress({ stepProgress, totalProgress });
    }
  }

  private resetState(): void {
    this.state = {
      isActive: false,
      currentStepIndex: 0,
      stepStartTime: 0,
      stepElapsedTime: 0,
      totalElapsedTime: 0,
      workoutStartTime: 0,
      currentStep: null,
      nextStep: null,
      workoutPlan: null,
      sessionId: null
    };
  }

  // Getters
  getState(): WorkoutEngineState {
    return { ...this.state };
  }

  getCurrentStep(): WorkoutStep | null {
    return this.state.currentStep;
  }

  getNextStep(): WorkoutStep | null {
    return this.state.nextStep;
  }

  getStepProgress(): number {
    if (!this.state.currentStep) return 0;
    return Math.min(
      this.state.stepElapsedTime / (this.state.currentStep.duration * 1000),
      1
    );
  }

  getTotalProgress(): number {
    if (!this.state.workoutPlan) return 0;
    return Math.min(
      this.state.totalElapsedTime / (this.state.workoutPlan.totalDuration * 1000),
      1
    );
  }

  getRemainingTime(): number {
    if (!this.state.workoutPlan) return 0;
    return Math.max(
      this.state.workoutPlan.totalDuration * 1000 - this.state.totalElapsedTime,
      0
    );
  }

  getStepRemainingTime(): number {
    if (!this.state.currentStep) return 0;
    return Math.max(
      this.state.currentStep.duration * 1000 - this.state.stepElapsedTime,
      0
    );
  }

  isActive(): boolean {
    return this.state.isActive;
  }

  // Settings
  setAutoResistanceControl(enabled: boolean): void {
    this.autoResistanceControl = enabled;
  }

  getAutoResistanceControl(): boolean {
    return this.autoResistanceControl;
  }

  // Manual control during workout
  async setManualResistance(level: number): Promise<void> {
    if (deviceManager.isConnected()) {
      await deviceManager.setResistance(level);
    }
  }

  async setManualPower(watts: number): Promise<void> {
    if (deviceManager.isConnected()) {
      await deviceManager.setTargetPower(watts);
    }
  }
}

// Singleton instance
export const workoutEngine = new WorkoutEngine();