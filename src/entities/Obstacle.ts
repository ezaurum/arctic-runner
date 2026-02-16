import * as THREE from 'three';

export type ObstacleType = 'iceHole' | 'crevasse' | 'seal';

export class Obstacle {
  readonly mesh: THREE.Group;
  type: ObstacleType = 'iceHole';
  active = false;

  // AABB bounds (half-extents)
  readonly halfWidth = 1;
  readonly halfDepth = 1;

  constructor() {
    this.mesh = new THREE.Group();
  }

  configure(type: ObstacleType): void {
    this.type = type;

    // Clear existing children
    while (this.mesh.children.length > 0) {
      this.mesh.remove(this.mesh.children[0]);
    }

    switch (type) {
      case 'iceHole':
        this.createIceHole();
        break;
      case 'crevasse':
        this.createCrevasse();
        break;
      case 'seal':
        this.createSeal();
        break;
    }
  }

  private createIceHole(): void {
    const geo = new THREE.CircleGeometry(1.2, 8);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x2244aa,
      transparent: true,
      opacity: 0.7,
    });
    const hole = new THREE.Mesh(geo, mat);
    hole.rotation.x = -Math.PI / 2;
    hole.position.y = 0.01;
    this.mesh.add(hole);
  }

  private createCrevasse(): void {
    const geo = new THREE.BoxGeometry(3, 0.5, 1.5);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x1a3355,
    });
    const crevasse = new THREE.Mesh(geo, mat);
    crevasse.position.y = -0.2;
    this.mesh.add(crevasse);

    // Edge ice
    const edgeGeo = new THREE.BoxGeometry(3.5, 0.1, 1.8);
    const edgeMat = new THREE.MeshStandardMaterial({ color: 0xaaccdd });
    const edge = new THREE.Mesh(edgeGeo, edgeMat);
    edge.position.y = 0.02;
    this.mesh.add(edge);
  }

  private createSeal(): void {
    // Body
    const bodyGeo = new THREE.SphereGeometry(0.6, 8, 6);
    bodyGeo.scale(1.5, 0.8, 1);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x666677 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.4;
    body.castShadow = true;
    this.mesh.add(body);

    // Head
    const headGeo = new THREE.SphereGeometry(0.35, 8, 6);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x555566 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 0.7, 0.6);
    this.mesh.add(head);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.05, 4, 4);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.15, 0.8, 0.85);
    this.mesh.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.15, 0.8, 0.85);
    this.mesh.add(rightEye);
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
