import * as THREE from 'three';
import { ROAD_WIDTH, ROAD_SEGMENT_LENGTH, ROAD_SEGMENT_COUNT } from '../config/constants';
import { StageConfig, BalanceConfig } from '../config/types';
import { interpolateKeyframes } from '../utils/math';
import { EventBus } from '../core/EventBus';

interface Segment {
  road: THREE.Mesh;
  groundLeft: THREE.Mesh;
  groundRight: THREE.Mesh;
  props: THREE.Mesh[];
  /** World-space Z of the segment's back edge (more negative = further ahead) */
  backZ: number;
}

const GROUND_SIDE_WIDTH = 30;

// Shared prop geometries
const PROP_GEOS = {
  iceRock: new THREE.DodecahedronGeometry(0.6, 0),
  tallRock: new THREE.ConeGeometry(0.4, 1.5, 5),
  pole: new THREE.CylinderGeometry(0.05, 0.05, 1.8, 4),
};
const PROP_MATS = {
  ice: new THREE.MeshStandardMaterial({ color: 0xeef4fa, roughness: 0.2 }),
  rock: new THREE.MeshStandardMaterial({ color: 0xdde4ea, roughness: 0.4 }),
  pole: new THREE.MeshStandardMaterial({ color: 0xcc4444, roughness: 0.5 }),
};

export class RoadManager {
  private segments: Segment[] = [];
  /** Z of the next segment to place (back edge of the frontmost segment) */
  private headZ = 0;
  private curveKeyframes: { at: number; value: number }[] = [];
  private elevationKeyframes: { at: number; value: number }[] = [];
  private scene: THREE.Scene;
  private eventBus: EventBus;
  private roadMats: THREE.MeshStandardMaterial[] = [];
  private groundMats: THREE.MeshStandardMaterial[] = [];

  constructor(scene: THREE.Scene, eventBus: EventBus) {
    this.scene = scene;
    this.eventBus = eventBus;

    for (let i = 0; i < ROAD_SEGMENT_COUNT; i++) {
      // Each segment gets its own geometry so we can warp vertices per-segment
      const roadGeo = new THREE.PlaneGeometry(ROAD_WIDTH, ROAD_SEGMENT_LENGTH, 1, 1);
      const roadMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.5,
        metalness: 0,
      });
      const road = new THREE.Mesh(roadGeo, roadMat);
      road.rotation.x = -Math.PI / 2;
      road.receiveShadow = true;
      this.scene.add(road);
      this.roadMats.push(roadMat);

      const groundLeftGeo = new THREE.PlaneGeometry(GROUND_SIDE_WIDTH, ROAD_SEGMENT_LENGTH, 1, 1);
      const groundMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.5,
        metalness: 0,
      });
      const groundLeft = new THREE.Mesh(groundLeftGeo, groundMat);
      groundLeft.rotation.x = -Math.PI / 2;
      groundLeft.receiveShadow = true;
      this.scene.add(groundLeft);
      this.groundMats.push(groundMat);

      const groundRightMat = groundMat.clone();
      const groundRightGeo = new THREE.PlaneGeometry(GROUND_SIDE_WIDTH, ROAD_SEGMENT_LENGTH, 1, 1);
      const groundRight = new THREE.Mesh(groundRightGeo, groundRightMat);
      groundRight.rotation.x = -Math.PI / 2;
      groundRight.receiveShadow = true;
      this.scene.add(groundRight);
      this.groundMats.push(groundRightMat);

      // Roadside props (2-4 per segment)
      const props: THREE.Mesh[] = [];
      const propCount = 2 + Math.floor(Math.random() * 3);
      for (let p = 0; p < propCount; p++) {
        const type = Math.random();
        let mesh: THREE.Mesh;
        if (type < 0.5) {
          mesh = new THREE.Mesh(PROP_GEOS.iceRock, PROP_MATS.ice);
          const s = 0.5 + Math.random() * 1.0;
          mesh.scale.set(s, s * (0.5 + Math.random() * 0.5), s);
        } else if (type < 0.8) {
          mesh = new THREE.Mesh(PROP_GEOS.tallRock, PROP_MATS.rock);
          const s = 0.6 + Math.random() * 0.8;
          mesh.scale.set(s, s, s);
        } else {
          mesh = new THREE.Mesh(PROP_GEOS.pole, PROP_MATS.pole);
        }
        mesh.castShadow = true;
        mesh.rotation.y = Math.random() * Math.PI * 2;
        this.scene.add(mesh);
        props.push(mesh);
      }

      this.segments.push({ road, groundLeft, groundRight, props, backZ: 0 });
    }
  }

  configureRendering(config: BalanceConfig['rendering']): void {
    const roadColor = new THREE.Color(config.roadColor);
    const groundColor = new THREE.Color(config.groundColor);
    for (const mat of this.roadMats) {
      mat.color.copy(roadColor);
      mat.roughness = config.roadRoughness;
      mat.metalness = config.roadMetalness;
    }
    for (const mat of this.groundMats) {
      mat.color.copy(groundColor);
      mat.roughness = config.groundRoughness;
      mat.metalness = config.groundMetalness;
    }
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

  /**
   * Place a segment so its back edge is at `backZ`.
   * The front edge is at `backZ + ROAD_SEGMENT_LENGTH`.
   * We warp the 4 corners of each plane so the front edge matches
   * the curve/elevation at frontZ and the back edge matches backZ.
   */
  private placeSegment(seg: Segment, backZ: number): void {
    seg.backZ = backZ;
    const frontZ = backZ + ROAD_SEGMENT_LENGTH;

    const backDist = Math.abs(backZ);
    const frontDist = Math.abs(frontZ);

    const backCX = this.getCurveXAt(backDist);
    const frontCX = this.getCurveXAt(frontDist);
    const backCY = this.getElevationAt(backDist);
    const frontCY = this.getElevationAt(frontDist);

    // Center the mesh group at the midpoint
    const midZ = (backZ + frontZ) / 2;
    const midX = (backCX + frontCX) / 2;
    const midY = (backCY + frontCY) / 2;

    // --- Road ---
    this.warpPlane(
      seg.road, midX, midY - 0.01, midZ,
      backCX - midX, frontCX - midX,
      backCY - midY, frontCY - midY,
      0 // no lateral offset
    );

    // --- Ground Left ---
    const gndOffX = ROAD_WIDTH / 2 + GROUND_SIDE_WIDTH / 2;
    this.warpPlane(
      seg.groundLeft, midX - gndOffX, midY - 0.02, midZ,
      backCX - midX, frontCX - midX,
      backCY - midY, frontCY - midY,
      0
    );

    // --- Ground Right ---
    this.warpPlane(
      seg.groundRight, midX + gndOffX, midY - 0.02, midZ,
      backCX - midX, frontCX - midX,
      backCY - midY, frontCY - midY,
      0
    );

    // --- Roadside props ---
    for (let p = 0; p < seg.props.length; p++) {
      const prop = seg.props[p];
      const t = (p + 0.5) / seg.props.length; // spread along segment length
      const propZ = backZ + t * ROAD_SEGMENT_LENGTH;
      const propDist = Math.abs(propZ);
      const propCX = this.getCurveXAt(propDist);
      const propCY = this.getElevationAt(propDist);
      const side = p % 2 === 0 ? -1 : 1;
      const offset = ROAD_WIDTH / 2 + 1.5 + Math.random() * 6;
      prop.position.set(
        propCX + side * offset,
        propCY + prop.scale.y * 0.3,
        propZ
      );
    }
  }

  /**
   * Warp a PlaneGeometry(W, L, 1, 1) that has been rotated -90° on X.
   * After rotation, local +Z maps to world -Z (back edge) and local -Z to world +Z (front edge).
   *
   * PlaneGeometry(w,h,1,1) vertices (before rotation):
   *   0: (-w/2, +h/2, 0)  — after rot: (-w/2, 0, -h/2) = back-left
   *   1: (+w/2, +h/2, 0)  — after rot: (+w/2, 0, -h/2) = back-right
   *   2: (-w/2, -h/2, 0)  — after rot: (-w/2, 0, +h/2) = front-left
   *   3: (+w/2, -h/2, 0)  — after rot: (+w/2, 0, +h/2) = front-right
   *
   * We shift x (lateral curve) and y (elevation) per edge.
   * backDx/frontDx = how much x shifts relative to mesh center.
   * backDy/frontDy = how much y shifts relative to mesh center.
   */
  private warpPlane(
    mesh: THREE.Mesh,
    worldX: number, worldY: number, worldZ: number,
    backDx: number, frontDx: number,
    backDy: number, frontDy: number,
    _lateralOffset: number
  ): void {
    mesh.position.set(worldX, worldY, worldZ);

    const pos = (mesh.geometry as THREE.BufferGeometry).attributes.position as THREE.BufferAttribute;
    const hw = pos.getX(1); // half-width (positive side)
    const hh = ROAD_SEGMENT_LENGTH / 2;

    // vertex 0: back-left (local: -hw, +hh, 0) -> after rot becomes (-hw, 0, -hh)
    // We modify the pre-rotation positions; the mesh.rotation handles the rest.
    // Back edge (local y = +hh before rotation)
    pos.setXY(0, -hw + backDx, hh);   // back-left
    pos.setXY(1,  hw + backDx, hh);   // back-right
    // Front edge (local y = -hh before rotation)
    pos.setXY(2, -hw + frontDx, -hh); // front-left
    pos.setXY(3,  hw + frontDx, -hh); // front-right

    // Elevation: adjust Z in local space (maps to Y in world after -90° X rotation)
    pos.setZ(0, backDy);
    pos.setZ(1, backDy);
    pos.setZ(2, frontDy);
    pos.setZ(3, frontDy);

    pos.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
  }

  update(playerZ: number): void {
    for (const seg of this.segments) {
      // Front edge of segment = backZ + SEGMENT_LENGTH
      const frontEdge = seg.backZ + ROAD_SEGMENT_LENGTH;
      if (frontEdge > playerZ + 60) {
        // Segment is behind the player — recycle to front
        this.headZ -= ROAD_SEGMENT_LENGTH;
        this.placeSegment(seg, this.headZ);

        this.eventBus.emit('segmentRecycled', {
          z: this.headZ,
          x: seg.road.position.x,
          y: seg.road.position.y,
          distance: Math.abs(this.headZ),
        });
      }
    }
  }

  reset(): void {
    // Place segments starting well behind the camera (z=+60) to far ahead
    const behindCount = 8; // segments behind player to cover camera view
    const startZ = behindCount * ROAD_SEGMENT_LENGTH; // e.g. +80
    this.headZ = startZ;
    for (let i = 0; i < ROAD_SEGMENT_COUNT; i++) {
      const backZ = startZ - (i + 1) * ROAD_SEGMENT_LENGTH;
      this.placeSegment(this.segments[i], backZ);
    }
    this.headZ = startZ - ROAD_SEGMENT_COUNT * ROAD_SEGMENT_LENGTH;
  }
}
