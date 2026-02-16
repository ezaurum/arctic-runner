import * as THREE from 'three';
import { BalanceConfig } from '../config/types';
import { lerp } from '../utils/math';

export class CameraController {
  private camera: THREE.PerspectiveCamera;
  private offsetY = 5;
  private offsetZ = 12;
  private lookAheadZ = 20;
  private smoothing = 0.05;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
  }

  configure(config: BalanceConfig['camera']): void {
    this.offsetY = config.offsetY;
    this.offsetZ = config.offsetZ;
    this.lookAheadZ = config.lookAheadZ;
    this.smoothing = config.smoothing;
  }

  update(targetPosition: THREE.Vector3, dt: number): void {
    const t = 1 - Math.pow(1 - this.smoothing, dt * 60);

    const desiredX = targetPosition.x;
    const desiredY = targetPosition.y + this.offsetY;
    const desiredZ = targetPosition.z + this.offsetZ;

    this.camera.position.x = lerp(this.camera.position.x, desiredX, t);
    this.camera.position.y = lerp(this.camera.position.y, desiredY, t);
    this.camera.position.z = lerp(this.camera.position.z, desiredZ, t);

    const lookTarget = new THREE.Vector3(
      targetPosition.x,
      targetPosition.y + 1,
      targetPosition.z - this.lookAheadZ
    );
    this.camera.lookAt(lookTarget);
  }
}
