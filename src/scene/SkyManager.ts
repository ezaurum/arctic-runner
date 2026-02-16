import * as THREE from 'three';

export class SkyManager {
  private particles: THREE.Points | null = null;
  private scene: THREE.Scene;
  /** Group that follows the player so sky/mountains never fall behind */
  private envGroup: THREE.Group;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.envGroup = new THREE.Group();
    this.scene.add(this.envGroup);
    this.createBackground();
  }

  private createBackground(): void {
    const skyGeo = new THREE.SphereGeometry(500, 16, 16);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0x87ceeb,
      side: THREE.BackSide,
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    this.envGroup.add(sky);

    this.createMountains();
  }

  private createMountains(): void {
    const mountainMat = new THREE.MeshBasicMaterial({ color: 0x6688aa });

    // Place mountains only on left and right sides, avoiding the road (Z axis)
    const sides = [-1, 1]; // left, right
    for (const side of sides) {
      for (let i = 0; i < 8; i++) {
        const w = 30 + Math.random() * 40;
        const h = 15 + Math.random() * 25;
        const geo = new THREE.ConeGeometry(w, h, 4);
        const mountain = new THREE.Mesh(geo, mountainMat);
        const x = side * (150 + Math.random() * 200);
        const z = (Math.random() - 0.5) * 600;
        mountain.position.set(x, h / 2 - 5, z);
        mountain.rotation.y = Math.random() * Math.PI;
        this.envGroup.add(mountain);
      }
    }
  }

  createSnowParticles(intensity: number): void {
    if (this.particles) {
      this.scene.remove(this.particles);
    }
    if (intensity <= 0) return;

    const count = Math.floor(500 * intensity);
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = Math.random() * 50;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.3,
      transparent: true,
      opacity: 0.8,
    });
    this.particles = new THREE.Points(geo, mat);
    this.scene.add(this.particles);
  }

  update(playerZ: number, dt: number): void {
    // Keep sky/mountains centered on player
    this.envGroup.position.z = playerZ;

    if (!this.particles) return;

    this.particles.position.z = playerZ;
    const positions = this.particles.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < positions.count; i++) {
      let y = positions.getY(i) - 10 * dt;
      if (y < 0) y = 50;
      positions.setY(i, y);
    }
    positions.needsUpdate = true;
  }
}
