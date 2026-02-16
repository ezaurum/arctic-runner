import { StageConfig } from '../config/types';
import { EventBus } from '../core/EventBus';

export class StageSystem {
  private stages: StageConfig[] = [];
  private currentIndex = 0;
  timer = 0;
  distanceTraveled = 0;
  private startZ = 0;

  constructor(private eventBus: EventBus) {}

  configure(stages: StageConfig[]): void {
    this.stages = stages;
  }

  get currentStage(): StageConfig | null {
    return this.stages[this.currentIndex] ?? null;
  }

  get stageIndex(): number {
    return this.currentIndex;
  }

  get progress(): number {
    const stage = this.currentStage;
    if (!stage) return 0;
    return Math.min(this.distanceTraveled / stage.distance, 1);
  }

  get remainingTime(): number {
    const stage = this.currentStage;
    if (!stage) return 0;
    return Math.max(stage.timeLimit - this.timer, 0);
  }

  startStage(index: number, playerZ: number): void {
    this.currentIndex = index;
    this.timer = 0;
    this.distanceTraveled = 0;
    this.startZ = playerZ;
    this.eventBus.emit('stageStart', this.currentStage);
  }

  update(dt: number, playerZ: number): 'playing' | 'complete' | 'timeUp' {
    const stage = this.currentStage;
    if (!stage) return 'playing';

    this.timer += dt;
    this.distanceTraveled = Math.abs(playerZ - this.startZ);

    if (this.distanceTraveled >= stage.distance) {
      return 'complete';
    }

    if (this.timer >= stage.timeLimit) {
      return 'timeUp';
    }

    return 'playing';
  }

  get hasNextStage(): boolean {
    return this.currentIndex + 1 < this.stages.length;
  }

  advanceStage(): void {
    this.currentIndex++;
  }

  reset(): void {
    this.currentIndex = 0;
    this.timer = 0;
    this.distanceTraveled = 0;
    this.startZ = 0;
  }
}
