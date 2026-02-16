import * as THREE from 'three';

export type ObstacleType = 'iceHole' | 'crevasse' | 'seal';

/** Distance at which a hiding seal detects the player and pops up */
const SEAL_REVEAL_DISTANCE = 25;
/** How long the pop-up animation takes (seconds) */
const SEAL_POPUP_DURATION = 0.25;
/** How far below ground the seal hides */
const SEAL_HIDE_Y = -1.5;

export class Obstacle {
  readonly mesh: THREE.Group;
  /** Inner group for seal pop-up animation (moves Y independently of mesh position) */
  private sealBody: THREE.Group | null = null;
  type: ObstacleType = 'iceHole';
  active = false;

  // AABB bounds (half-extents)
  halfWidth = 1.5;
  halfDepth = 1.2;

  // Seal reveal state
  private revealed = false;
  private revealTimer = 0;

  constructor() {
    this.mesh = new THREE.Group();
  }

  configure(type: ObstacleType): void {
    this.type = type;
    this.sealBody = null;
    this.revealed = false;
    this.revealTimer = 0;

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
    // Wide dark abyss
    const abyssGeo = new THREE.PlaneGeometry(6, 3);
    const abyssMat = new THREE.MeshBasicMaterial({ color: 0x020510 });
    const abyss = new THREE.Mesh(abyssGeo, abyssMat);
    abyss.rotation.x = -Math.PI / 2;
    abyss.position.y = -0.4;
    this.mesh.add(abyss);

    // Inner walls for depth
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x101828 });

    const frontWallGeo = new THREE.PlaneGeometry(6, 0.8);
    const frontWall = new THREE.Mesh(frontWallGeo, wallMat);
    frontWall.position.set(0, -0.2, 1.5);
    frontWall.rotation.x = Math.PI * 0.25;
    this.mesh.add(frontWall);

    const backWall = new THREE.Mesh(frontWallGeo.clone(), wallMat);
    backWall.position.set(0, -0.2, -1.5);
    backWall.rotation.x = -Math.PI * 0.25;
    this.mesh.add(backWall);

    // Jagged ice edges — raised lips along both sides
    const edgeMat = new THREE.MeshStandardMaterial({ color: 0xc8dce6 });
    for (let i = -4; i <= 4; i++) {
      const w = 0.5 + Math.random() * 0.6;
      const h = 0.1 + Math.random() * 0.15;
      const d = 0.3 + Math.random() * 0.4;
      const edgeGeo = new THREE.BoxGeometry(w, h, d);

      const topEdge = new THREE.Mesh(edgeGeo, edgeMat);
      topEdge.position.set(i * 0.65, h / 2, 1.4 + Math.random() * 0.3);
      topEdge.rotation.y = (Math.random() - 0.5) * 0.4;
      topEdge.castShadow = true;
      this.mesh.add(topEdge);

      const botEdge = new THREE.Mesh(edgeGeo.clone(), edgeMat);
      botEdge.position.set(i * 0.65, h / 2, -1.4 - Math.random() * 0.3);
      botEdge.rotation.y = (Math.random() - 0.5) * 0.4;
      botEdge.castShadow = true;
      this.mesh.add(botEdge);
    }

    this.halfWidth = 2.0;
    this.halfDepth = 1.5;
  }

  private createSeal(): void {
    // Disguised hole — slightly smaller, greenish tint, irregular rim
    const holeGeo = new THREE.CircleGeometry(1.6, 10);
    const holeMat = new THREE.MeshStandardMaterial({
      color: 0x0e1e4a,
      transparent: true,
      opacity: 0.9,
    });
    const hole = new THREE.Mesh(holeGeo, holeMat);
    hole.rotation.x = -Math.PI / 2;
    hole.position.y = 0.02;
    this.mesh.add(hole);

    const rimGeo = new THREE.RingGeometry(1.4, 2.0, 10);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xaacccc,
      emissive: 0x2a3a3a,
      emissiveIntensity: 0.15,
    });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = 0.05;
    this.mesh.add(rim);

    // Seal body group — starts hidden below ground
    this.sealBody = new THREE.Group();
    this.sealBody.position.y = SEAL_HIDE_Y;
    this.mesh.add(this.sealBody);

    // Body
    const bodyGeo = new THREE.SphereGeometry(0.9, 8, 6);
    bodyGeo.scale(1.6, 0.9, 1.2);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x556677 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.6;
    body.castShadow = true;
    this.sealBody.add(body);

    // Head
    const headGeo = new THREE.SphereGeometry(0.5, 8, 6);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x445566 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 1.0, 0.8);
    head.castShadow = true;
    this.sealBody.add(head);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.08, 6, 6);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.2, 1.1, 1.15);
    this.sealBody.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.2, 1.1, 1.15);
    this.sealBody.add(rightEye);

    // Nose
    const noseGeo = new THREE.SphereGeometry(0.07, 4, 4);
    const noseMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, 1.0, 1.3);
    this.sealBody.add(nose);
  }

  update(dt: number, playerZ: number): void {
    if (this.type !== 'seal' || !this.sealBody) return;

    if (!this.revealed) {
      // Check if player is close enough
      const dist = Math.abs(this.mesh.position.z - playerZ);
      if (dist < SEAL_REVEAL_DISTANCE) {
        this.revealed = true;
        this.revealTimer = 0;
      }
    }

    if (this.revealed && this.revealTimer < SEAL_POPUP_DURATION) {
      this.revealTimer += dt;
      const t = Math.min(this.revealTimer / SEAL_POPUP_DURATION, 1);
      // Ease-out bounce
      const ease = 1 - Math.pow(1 - t, 3);
      this.sealBody.position.y = SEAL_HIDE_Y + (0 - SEAL_HIDE_Y) * ease;
    }
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
    this.revealed = false;
    this.revealTimer = 0;
    if (this.sealBody) {
      this.sealBody.position.y = SEAL_HIDE_Y;
    }
  }
}
