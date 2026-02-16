import { Penguin } from '../entities/Penguin';
import { ObstacleFactory } from '../entities/ObstacleFactory';
import { CollectibleFactory } from '../entities/CollectibleFactory';
import { BalanceConfig } from '../config/types';
import { EventBus } from '../core/EventBus';

export class CollisionSystem {
  private penguin: Penguin;
  private obstacleFactory: ObstacleFactory;
  private collectibleFactory: CollectibleFactory;
  private balance: BalanceConfig | null = null;
  private eventBus: EventBus;

  constructor(
    penguin: Penguin,
    obstacleFactory: ObstacleFactory,
    collectibleFactory: CollectibleFactory,
    eventBus: EventBus
  ) {
    this.penguin = penguin;
    this.obstacleFactory = obstacleFactory;
    this.collectibleFactory = collectibleFactory;
    this.eventBus = eventBus;
  }

  configure(balance: BalanceConfig): void {
    this.balance = balance;
  }

  update(): void {
    if (!this.balance) return;

    const pp = this.penguin.position;
    const penguinHalfW = 0.4;
    const penguinHalfD = 0.4;

    // Check obstacles
    for (let i = this.obstacleFactory.activeObstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacleFactory.activeObstacles[i];
      if (!obs.active) continue;

      // Can jump over?
      const obsBalance = this.balance.obstacles[obs.type];
      if (obsBalance?.canJumpOver && this.penguin.isJumping) continue;
      if (this.penguin.isFlying) continue;

      const op = obs.mesh.position;
      if (
        Math.abs(pp.x - op.x) < penguinHalfW + obs.halfWidth &&
        Math.abs(pp.z - op.z) < penguinHalfD + obs.halfDepth
      ) {
        if (obsBalance) {
          this.penguin.stumble(obsBalance.speedPenalty, obsBalance.stunDuration, op.x);
          this.eventBus.emit('obstacleHit', obs.type, obsBalance);
        }
        this.obstacleFactory.recycle(obs);
      }
    }

    // Check collectibles
    for (let i = this.collectibleFactory.activeCollectibles.length - 1; i >= 0; i--) {
      const col = this.collectibleFactory.activeCollectibles[i];
      if (!col.active) continue;

      const cp = col.mesh.position;
      if (
        Math.abs(pp.x - cp.x) < penguinHalfW + col.halfWidth &&
        Math.abs(pp.z - cp.z) < penguinHalfD + col.halfDepth
      ) {
        this.eventBus.emit('collectItem', col.type);

        if (col.type === 'propeller') {
          const itemBalance = this.balance.items['propeller'];
          if (itemBalance?.duration && itemBalance?.speedMultiplier) {
            this.penguin.activateFly(itemBalance.duration, itemBalance.speedMultiplier);
          }
        }

        this.collectibleFactory.recycle(col);
      }
    }
  }
}
