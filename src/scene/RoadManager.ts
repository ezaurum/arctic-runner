import * as THREE from 'three';
import { ROAD_WIDTH, ROAD_SEGMENT_LENGTH, ROAD_SEGMENT_COUNT } from '../config/constants';
import { StageConfig } from '../config/types';
import { interpolateKeyframes } from '../utils/math';
import { EventBus } from '../core/EventBus';

export class RoadManager {
  private segments: THREE.Mesh[] = [];
  private segmentStartIndices: number[] = [];
  private nextSegmentIndex = 0;
  private totalDistance = 0;
  private curveKeyframes: { at: number; value: number }[] = [];
  private elevationKeyframes: { at: number; value: number }[] = [];
  private scene: THREE.Scene;
  private eventBus: EventBus;

  constructor(scene: THREE.Scene, eventBus: EventBus) {
    this.scene = scene;
    this.eventBus = eventBus;

    const geometry = new THREE.PlaneGeometry(ROAD_WIDTH, ROAD_SEGMENT_LENGTH);
    const material = new THREE.MeshStandardMaterial({
      color: 0x99bbcc,
      roughness: 0.3,
      metalness: 0.1,
    });

    for (let i = 0; i < ROAD_SEGMENT_COUNT; i++) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.z = -i * ROAD_SEGMENT_LENGTH;
      mesh.position.y = -0.01;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.segments.push(mesh);
      this.segmentStartIndices.push(i);
    }
    this.nextSegmentIndex = 0;
  }

  configureStage(stage: StageConfig): void {
    this.curveKeyframes = stage.roadCurve.map(k => ({ at: k.at, value: k.curveX }));
    this.elevationKeyframes = stage.roadElevation.map(k => ({ at: k.at, value: k.y }));
  }

  getCurveXAt(distance: number): number {
    return interpolateKeyframes(this.curveKeyframes, distance);
  }

  getElevationAt(distance: number): number {
    return interpolateKeyframes(this.elevationKeyframes, distance);
  }

  update(playerZ: number): void {
    const frontEdge = playerZ - ROAD_SEGMENT_COUNT * ROAD_SEGMENT_LENGTH * 0.8;

    for (let i = 0; i < ROAD_SEGMENT_COUNT; i++) {
      const seg = this.segments[i];
      if (seg.position.z > playerZ + ROAD_SEGMENT_LENGTH * 2) {
        // Recycle to front
        this.nextSegmentIndex++;
        const newZ = frontEdge - (this.nextSegmentIndex % ROAD_SEGMENT_COUNT) * ROAD_SEGMENT_LENGTH;
        const dist = Math.abs(newZ);
        seg.position.z = newZ;
        seg.position.x = this.getCurveXAt(dist);
        seg.position.y = this.getElevationAt(dist) - 0.01;

        this.eventBus.emit('segmentRecycled', {
          z: newZ,
          x: seg.position.x,
          distance: dist,
        });
      }
    }
  }

  reset(): void {
    this.nextSegmentIndex = 0;
    for (let i = 0; i < ROAD_SEGMENT_COUNT; i++) {
      const seg = this.segments[i];
      seg.position.set(0, -0.01, -i * ROAD_SEGMENT_LENGTH);
    }
  }
}
