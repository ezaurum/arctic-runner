import * as THREE from 'three';
import { Collectible, CollectibleType } from './Collectible';
import { ObjectPool } from '../utils/pool';

export class CollectibleFactory {
  private pools: Map<CollectibleType, ObjectPool<Collectible>> = new Map();
  private scene: THREE.Scene;
  readonly activeCollectibles: Collectible[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    const types: CollectibleType[] = ['fish', 'flag', 'propeller'];
    for (const type of types) {
      const pool = new ObjectPool<Collectible>(
        () => {
          const col = new Collectible();
          col.configure(type);
          col.deactivate();
          this.scene.add(col.mesh);
          return col;
        },
        (col) => {
          col.deactivate();
        },
        5
      );
      this.pools.set(type, pool);
    }
  }

  spawn(type: CollectibleType, x: number, y: number, z: number): Collectible {
    const pool = this.pools.get(type)!;
    const col = pool.acquire();
    col.configure(type);
    col.setPosition(x, y, z);
    col.activate();
    this.activeCollectibles.push(col);
    return col;
  }

  recycle(col: Collectible): void {
    const idx = this.activeCollectibles.indexOf(col);
    if (idx >= 0) this.activeCollectibles.splice(idx, 1);
    const pool = this.pools.get(col.type);
    if (pool) pool.release(col);
  }

  recycleFarBehind(playerZ: number): void {
    for (let i = this.activeCollectibles.length - 1; i >= 0; i--) {
      const col = this.activeCollectibles[i];
      if (col.mesh.position.z > playerZ + 60) {
        this.recycle(col);
      }
    }
  }

  updateAll(dt: number): void {
    for (const col of this.activeCollectibles) {
      col.update(dt);
    }
  }

  reset(): void {
    for (let i = this.activeCollectibles.length - 1; i >= 0; i--) {
      this.recycle(this.activeCollectibles[i]);
    }
  }
}
