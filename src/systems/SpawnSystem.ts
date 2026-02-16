import { StageConfig } from '../config/types';
import { ObstacleFactory } from '../entities/ObstacleFactory';
import { CollectibleFactory } from '../entities/CollectibleFactory';
import { ObstacleType } from '../entities/Obstacle';
import { CollectibleType } from '../entities/Collectible';
import { ROAD_WIDTH } from '../config/constants';
import { EventBus } from '../core/EventBus';

export class SpawnSystem {
  private obstacleFactory: ObstacleFactory;
  private collectibleFactory: CollectibleFactory;
  private stage: StageConfig | null = null;

  constructor(
    obstacleFactory: ObstacleFactory,
    collectibleFactory: CollectibleFactory,
    eventBus: EventBus
  ) {
    this.obstacleFactory = obstacleFactory;
    this.collectibleFactory = collectibleFactory;

    eventBus.on('segmentRecycled', (data: { z: number; x: number; y: number; distance: number }) => {
      this.onSegmentRecycled(data);
    });
  }

  configureStage(stage: StageConfig): void {
    this.stage = stage;
  }

  private onSegmentRecycled(data: { z: number; x: number; y: number; distance: number }): void {
    if (!this.stage) return;

    const { z, x, y, distance } = data;

    // Spawn obstacles
    for (const [type, config] of Object.entries(this.stage.obstacles)) {
      if (config.startAfter && distance < config.startAfter) continue;
      if (Math.random() < config.frequency) {
        const offsetX = (Math.random() - 0.5) * (ROAD_WIDTH - 2);
        this.obstacleFactory.spawn(type as ObstacleType, x + offsetX, y, z);
      }
    }

    // Spawn collectibles
    for (const [type, config] of Object.entries(this.stage.collectibles)) {
      if (config.startAfter && distance < config.startAfter) continue;
      if (Math.random() < config.frequency) {
        const offsetX = (Math.random() - 0.5) * (ROAD_WIDTH - 2);
        this.collectibleFactory.spawn(type as CollectibleType, x + offsetX, y, z);
      }
    }
  }

  reset(): void {
    this.obstacleFactory.reset();
    this.collectibleFactory.reset();
  }
}
