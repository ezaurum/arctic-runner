import * as THREE from 'three';
import { ROAD_WIDTH, GROUND_WIDTH, ROAD_SEGMENT_LENGTH, ROAD_SEGMENT_COUNT } from '../config/constants';

export class GroundManager {
  private leftSegments: THREE.Mesh[] = [];
  private rightSegments: THREE.Mesh[] = [];
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    const sideWidth = (GROUND_WIDTH - ROAD_WIDTH) / 2;
    const geometry = new THREE.PlaneGeometry(sideWidth, ROAD_SEGMENT_LENGTH);
    const material = new THREE.MeshStandardMaterial({
      color: 0xeef4f8,
      roughness: 0.8,
    });

    for (let i = 0; i < ROAD_SEGMENT_COUNT; i++) {
      const left = new THREE.Mesh(geometry, material);
      left.rotation.x = -Math.PI / 2;
      left.position.set(-(ROAD_WIDTH / 2 + sideWidth / 2), -0.02, -i * ROAD_SEGMENT_LENGTH);
      left.receiveShadow = true;
      this.scene.add(left);
      this.leftSegments.push(left);

      const right = new THREE.Mesh(geometry, material);
      right.rotation.x = -Math.PI / 2;
      right.position.set(ROAD_WIDTH / 2 + sideWidth / 2, -0.02, -i * ROAD_SEGMENT_LENGTH);
      right.receiveShadow = true;
      this.scene.add(right);
      this.rightSegments.push(right);
    }
  }

  update(playerZ: number): void {
    const frontEdge = playerZ - ROAD_SEGMENT_COUNT * ROAD_SEGMENT_LENGTH * 0.8;

    for (let i = 0; i < ROAD_SEGMENT_COUNT; i++) {
      if (this.leftSegments[i].position.z > playerZ + ROAD_SEGMENT_LENGTH * 2) {
        const newZ = frontEdge - (i * ROAD_SEGMENT_LENGTH);
        this.leftSegments[i].position.z = newZ;
        this.rightSegments[i].position.z = newZ;
      }
    }
  }

  reset(): void {
    for (let i = 0; i < ROAD_SEGMENT_COUNT; i++) {
      this.leftSegments[i].position.z = -i * ROAD_SEGMENT_LENGTH;
      this.rightSegments[i].position.z = -i * ROAD_SEGMENT_LENGTH;
    }
  }
}
