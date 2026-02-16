import * as THREE from 'three';
import { Obstacle, ObstacleType } from './Obstacle';
import { ObjectPool } from '../utils/pool';

export class ObstacleFactory {
  private pools: Map<ObstacleType, ObjectPool<Obstacle>> = new Map();
  private scene: THREE.Scene;
  readonly activeObstacles: Obstacle[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    const types: ObstacleType[] = ['iceHole', 'crevasse', 'seal'];
    for (const type of types) {
      const pool = new ObjectPool<Obstacle>(
        () => {
          const obs = new Obstacle();
          obs.configure(type);
          obs.deactivate();
          this.scene.add(obs.mesh);
          return obs;
        },
        (obs) => {
          obs.deactivate();
        },
        5
      );
      this.pools.set(type, pool);
    }
  }

  spawn(type: ObstacleType, x: number, y: number, z: number): Obstacle {
    const pool = this.pools.get(type)!;
    const obs = pool.acquire();
    obs.configure(type);
    obs.setPosition(x, y, z);
    obs.activate();
    this.activeObstacles.push(obs);
    return obs;
  }

  recycle(obs: Obstacle): void {
    const idx = this.activeObstacles.indexOf(obs);
    if (idx >= 0) this.activeObstacles.splice(idx, 1);
    const pool = this.pools.get(obs.type);
    if (pool) pool.release(obs);
  }

  recycleFarBehind(playerZ: number): void {
    for (let i = this.activeObstacles.length - 1; i >= 0; i--) {
      const obs = this.activeObstacles[i];
      if (obs.mesh.position.z > playerZ + 20) {
        this.recycle(obs);
      }
    }
  }

  reset(): void {
    for (let i = this.activeObstacles.length - 1; i >= 0; i--) {
      this.recycle(this.activeObstacles[i]);
    }
  }
}
