import * as THREE from 'three';
import { BalanceConfig } from '../config/types';
import { clamp } from '../utils/math';
import { ROAD_WIDTH } from '../config/constants';
import { InputManager } from '../core/InputManager';

export type PenguinState = 'running' | 'jumping' | 'stumbling' | 'flying' | 'sliding' | 'trapped' | 'dead';

export class Penguin {
  readonly mesh: THREE.Group;
  private body: THREE.Mesh;
  private leftFoot!: THREE.Mesh;
  private rightFoot!: THREE.Mesh;
  private state: PenguinState = 'running';

  speed = 30;
  private maxSpeed = 60;
  private acceleration = 8;
  private deceleration = 12;
  private lateralSpeed = 15;
  private jumpForce = 12;
  private gravity = 30;

  private velocityY = 0;
  private groundY = 0;
  dead = false;
  private stumbleTimer = 0;
  private slideTimer = 0;
  private flyTimer = 0;
  private flySpeedMultiplier = 1;
  private waddleTime = 0;
  private knockbackX = 0;

  constructor() {
    this.mesh = new THREE.Group();

    // Body (ellipsoid)
    const bodyGeo = new THREE.SphereGeometry(0.5, 8, 8);
    bodyGeo.scale(0.8, 1.2, 0.7);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e });
    this.body = new THREE.Mesh(bodyGeo, bodyMat);
    this.body.position.y = 0.8;
    this.body.castShadow = true;
    this.mesh.add(this.body);

    // Belly (white)
    const bellyGeo = new THREE.SphereGeometry(0.35, 8, 8);
    bellyGeo.scale(0.7, 1.0, 0.5);
    const bellyMat = new THREE.MeshStandardMaterial({ color: 0xf0f0f0 });
    const belly = new THREE.Mesh(bellyGeo, bellyMat);
    belly.position.set(0, 0.75, 0.2);
    this.mesh.add(belly);

    // Head
    const headGeo = new THREE.SphereGeometry(0.3, 8, 8);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 1.6, 0);
    head.castShadow = true;
    this.mesh.add(head);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.06, 6, 6);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.12, 1.65, 0.25);
    this.mesh.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.12, 1.65, 0.25);
    this.mesh.add(rightEye);

    // Beak
    const beakGeo = new THREE.ConeGeometry(0.08, 0.2, 4);
    const beakMat = new THREE.MeshStandardMaterial({ color: 0xff8800 });
    const beak = new THREE.Mesh(beakGeo, beakMat);
    beak.position.set(0, 1.55, 0.35);
    beak.rotation.x = Math.PI / 2;
    this.mesh.add(beak);

    // Feet
    const footGeo = new THREE.BoxGeometry(0.2, 0.08, 0.3);
    const footMat = new THREE.MeshStandardMaterial({ color: 0xff8800 });
    this.leftFoot = new THREE.Mesh(footGeo, footMat);
    this.leftFoot.position.set(-0.2, 0.04, 0.1);
    this.mesh.add(this.leftFoot);
    this.rightFoot = new THREE.Mesh(footGeo, footMat);
    this.rightFoot.position.set(0.2, 0.04, 0.1);
    this.mesh.add(this.rightFoot);

    // Face -Z direction (forward movement direction)
    this.mesh.rotation.y = Math.PI;
  }

  configure(config: BalanceConfig['penguin']): void {
    this.speed = config.baseSpeed;
    this.maxSpeed = config.maxSpeed;
    this.acceleration = config.acceleration;
    this.deceleration = config.deceleration;
    this.lateralSpeed = config.lateralSpeed;
    this.jumpForce = config.jumpForce;
    this.gravity = config.gravity;
  }

  update(dt: number, input: InputManager, roadCurveX: number, roadElevation: number): void {
    this.groundY = roadElevation;

    // Dead state: do nothing
    if (this.state === 'dead') return;

    // Trapped state: wait for jump input to escape
    if (this.state === 'trapped') {
      this.mesh.position.y = this.groundY - 0.8;
      if (input.jump) {
        this.state = 'jumping';
        this.velocityY = this.jumpForce;
        this.mesh.position.y = this.groundY;
      }
      return;
    }

    // Sliding state: knockback + timer, no forward movement
    if (this.state === 'sliding') {
      this.slideTimer -= dt;
      this.mesh.position.x += this.knockbackX * dt;
      this.knockbackX *= Math.pow(0.05, dt);
      this.mesh.position.y = this.groundY;

      const roadCenter = roadCurveX;
      this.mesh.position.x = clamp(
        this.mesh.position.x,
        roadCenter - ROAD_WIDTH / 2 + 0.5,
        roadCenter + ROAD_WIDTH / 2 - 0.5
      );

      if (this.slideTimer <= 0) {
        this.state = 'running';
      }
      return;
    }

    // State timers
    if (this.stumbleTimer > 0) {
      this.stumbleTimer -= dt;
      if (this.stumbleTimer <= 0) {
        this.state = 'running';
      }
    }

    if (this.flyTimer > 0) {
      this.flyTimer -= dt;
      if (this.flyTimer <= 0) {
        this.state = 'running';
        this.flySpeedMultiplier = 1;
      }
    }

    // Speed management
    if (this.state !== 'stumbling') {
      this.speed = Math.min(this.speed + this.acceleration * dt, this.maxSpeed);
    }

    // Lateral movement
    if (this.state === 'stumbling') {
      // Apply knockback that decays
      this.mesh.position.x += this.knockbackX * dt;
      this.knockbackX *= Math.pow(0.05, dt); // rapid decay
    } else {
      let moveX = 0;
      if (input.left) moveX -= this.lateralSpeed;
      if (input.right) moveX += this.lateralSpeed;
      this.mesh.position.x += moveX * dt;
    }

    // Always clamp to road bounds
    const roadCenter = roadCurveX;
    this.mesh.position.x = clamp(
      this.mesh.position.x,
      roadCenter - ROAD_WIDTH / 2 + 0.5,
      roadCenter + ROAD_WIDTH / 2 - 0.5
    );

    // Jump
    if (input.jump && this.state === 'running') {
      this.state = 'jumping';
      this.velocityY = this.jumpForce;
    }

    // Vertical movement
    if (this.state === 'jumping') {
      this.velocityY -= this.gravity * dt;
      this.mesh.position.y += this.velocityY * dt;
      if (this.mesh.position.y <= this.groundY) {
        this.mesh.position.y = this.groundY;
        this.velocityY = 0;
        this.state = 'running';
      }
    } else if (this.state === 'flying') {
      this.mesh.position.y = this.groundY + 3;
    } else {
      this.mesh.position.y = this.groundY;
    }

    // Forward movement
    const effectiveSpeed = this.speed * this.flySpeedMultiplier;
    this.mesh.position.z -= effectiveSpeed * dt;

    // Waddle + foot animation
    this.waddleTime += dt * effectiveSpeed * 0.3;
    this.mesh.rotation.z = Math.sin(this.waddleTime) * 0.08;

    // Feet stride: alternate forward/back
    const stride = Math.sin(this.waddleTime) * 0.25;
    this.leftFoot.position.z = 0.1 + stride;
    this.rightFoot.position.z = 0.1 - stride;
    // Slight lift on the forward foot
    this.leftFoot.position.y = 0.04 + Math.max(0, stride) * 0.15;
    this.rightFoot.position.y = 0.04 + Math.max(0, -stride) * 0.15;
  }

  stumble(speedPenalty: number, duration: number, obstacleX?: number): void {
    if (this.state === 'flying') return;

    this.state = 'stumbling';
    this.stumbleTimer = duration;
    this.speed *= (1 - speedPenalty);

    // Lateral knockback: push away from obstacle center
    if (obstacleX !== undefined) {
      const dir = this.mesh.position.x - obstacleX;
      this.knockbackX = (dir >= 0 ? 1 : -1) * 8;
    } else {
      this.knockbackX = (Math.random() > 0.5 ? 1 : -1) * 8;
    }
  }

  slide(obstacleX: number): void {
    if (this.state === 'flying') return;

    this.state = 'sliding';
    this.slideTimer = 0.6;

    // Push away from obstacle
    const dir = this.mesh.position.x - obstacleX;
    this.knockbackX = (dir >= 0 ? 1 : -1) * 12;
  }

  trap(): void {
    if (this.state === 'flying') return;

    this.state = 'trapped';
    this.speed = 0;
  }

  kill(): void {
    this.state = 'dead';
    this.dead = true;
  }

  activateFly(duration: number, speedMultiplier: number): void {
    this.state = 'flying';
    this.flyTimer = duration;
    this.flySpeedMultiplier = speedMultiplier;
  }

  get position(): THREE.Vector3 {
    return this.mesh.position;
  }

  get isJumping(): boolean {
    return this.state === 'jumping';
  }

  get isFlying(): boolean {
    return this.state === 'flying';
  }

  get currentState(): PenguinState {
    return this.state;
  }

  reset(): void {
    this.mesh.position.set(0, 0, 0);
    this.speed = 30;
    this.velocityY = 0;
    this.state = 'running';
    this.dead = false;
    this.mesh.visible = true;
    this.stumbleTimer = 0;
    this.slideTimer = 0;
    this.flyTimer = 0;
    this.flySpeedMultiplier = 1;
  }
}
