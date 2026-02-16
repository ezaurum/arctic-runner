import * as THREE from 'three';

export type CollectibleType = 'fish' | 'flag' | 'propeller';

export class Collectible {
  readonly mesh: THREE.Group;
  type: CollectibleType = 'fish';
  active = false;
  private rotationSpeed = 2;

  readonly halfWidth = 0.5;
  readonly halfDepth = 0.5;

  constructor() {
    this.mesh = new THREE.Group();
  }

  configure(type: CollectibleType): void {
    this.type = type;

    while (this.mesh.children.length > 0) {
      this.mesh.remove(this.mesh.children[0]);
    }

    switch (type) {
      case 'fish':
        this.createFish();
        break;
      case 'flag':
        this.createFlag();
        break;
      case 'propeller':
        this.createPropeller();
        break;
    }
  }

  private createFish(): void {
    const bodyGeo = new THREE.ConeGeometry(0.2, 0.8, 4);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x44aaff,
      emissive: 0x1155aa,
      emissiveIntensity: 0.3,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.z = Math.PI / 2;
    body.position.y = 0.8;
    this.mesh.add(body);

    // Tail
    const tailGeo = new THREE.ConeGeometry(0.15, 0.25, 3);
    const tail = new THREE.Mesh(tailGeo, bodyMat);
    tail.position.set(-0.5, 0.8, 0);
    tail.rotation.z = Math.PI / 2;
    this.mesh.add(tail);
  }

  private createFlag(): void {
    // Pole
    const poleGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.5);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x886644 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 0.75;
    this.mesh.add(pole);

    // Flag cloth
    const flagGeo = new THREE.PlaneGeometry(0.6, 0.4);
    const flagMat = new THREE.MeshStandardMaterial({
      color: 0xff4444,
      emissive: 0x881111,
      emissiveIntensity: 0.3,
      side: THREE.DoubleSide,
    });
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.position.set(0.3, 1.3, 0);
    this.mesh.add(flag);
  }

  private createPropeller(): void {
    // Cap
    const capGeo = new THREE.SphereGeometry(0.15, 6, 6);
    const capMat = new THREE.MeshStandardMaterial({
      color: 0xffcc00,
      emissive: 0xaa8800,
      emissiveIntensity: 0.5,
    });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.y = 1;
    this.mesh.add(cap);

    // Blades
    for (let i = 0; i < 3; i++) {
      const bladeGeo = new THREE.BoxGeometry(0.6, 0.05, 0.12);
      const bladeMat = new THREE.MeshStandardMaterial({ color: 0xff6600 });
      const blade = new THREE.Mesh(bladeGeo, bladeMat);
      blade.position.y = 1.15;
      blade.rotation.y = (i / 3) * Math.PI * 2;
      this.mesh.add(blade);
    }
  }

  update(dt: number): void {
    if (!this.active) return;
    this.mesh.rotation.y += this.rotationSpeed * dt;
    // Bobbing
    this.mesh.children.forEach(child => {
      // keep original positions, just add slight bob to the group
    });
  }

  setPosition(x: number, y: number, z: number): void {
    this.mesh.position.set(x, y, z);
  }

  deactivate(): void {
    this.active = false;
    this.mesh.visible = false;
  }

  activate(): void {
    this.active = true;
    this.mesh.visible = true;
  }
}
