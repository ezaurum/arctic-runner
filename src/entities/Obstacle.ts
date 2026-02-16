import * as THREE from 'three';

export type ObstacleType = 'iceHole' | 'crevasse' | 'seal';

export class Obstacle {
  readonly mesh: THREE.Group;
  type: ObstacleType = 'iceHole';
  active = false;

  // AABB bounds (half-extents)
  halfWidth = 1.5;
  halfDepth = 1.2;

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
    // Dark water surface
    const geo = new THREE.CircleGeometry(2, 12);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x112266,
      transparent: true,
      opacity: 0.85,
    });
    const hole = new THREE.Mesh(geo, mat);
    hole.rotation.x = -Math.PI / 2;
    hole.position.y = 0.02;
    this.mesh.add(hole);

    // Ice rim around the hole
    const rimGeo = new THREE.RingGeometry(1.8, 2.4, 12);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xbbddee,
      emissive: 0x334455,
      emissiveIntensity: 0.2,
    });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = 0.05;
    this.mesh.add(rim);
  }

  private createCrevasse(): void {
    const geo = new THREE.BoxGeometry(4, 0.8, 2.5);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x0a1a33,
    });
    const crevasse = new THREE.Mesh(geo, mat);
    crevasse.position.y = -0.3;
    this.mesh.add(crevasse);

    // Ice edges with slight height
    const edgeGeo = new THREE.BoxGeometry(4.5, 0.3, 2.8);
    const edgeMat = new THREE.MeshStandardMaterial({
      color: 0x99ccdd,
      emissive: 0x224455,
      emissiveIntensity: 0.2,
    });
    const edge = new THREE.Mesh(edgeGeo, edgeMat);
    edge.position.y = 0.1;
    this.mesh.add(edge);
  }

  private createSeal(): void {
    // Body - bigger and more visible
    const bodyGeo = new THREE.SphereGeometry(0.9, 8, 6);
    bodyGeo.scale(1.6, 0.9, 1.2);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x556677 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.6;
    body.castShadow = true;
    this.mesh.add(body);

    // Head
    const headGeo = new THREE.SphereGeometry(0.5, 8, 6);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x445566 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 1.0, 0.8);
    head.castShadow = true;
    this.mesh.add(head);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.08, 6, 6);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.2, 1.1, 1.15);
    this.mesh.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.2, 1.1, 1.15);
    this.mesh.add(rightEye);

    // Nose
    const noseGeo = new THREE.SphereGeometry(0.07, 4, 4);
    const noseMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, 1.0, 1.3);
    this.mesh.add(nose);
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
