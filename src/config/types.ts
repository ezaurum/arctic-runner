export interface StageConfig {
  id: number;
  name: string;
  distance: number;
  timeLimit: number;
  roadCurve: { at: number; curveX: number }[];
  roadElevation: { at: number; y: number }[];
  obstacles: Record<string, SpawnConfig>;
  collectibles: Record<string, SpawnConfig>;
  environment: {
    fogNear: number;
    fogFar: number;
    snowIntensity: number;
  };
}

export interface SpawnConfig {
  frequency: number;
  startAfter?: number;
}

export interface BalanceConfig {
  penguin: {
    baseSpeed: number;
    maxSpeed: number;
    acceleration: number;
    deceleration: number;
    lateralSpeed: number;
    jumpForce: number;
    gravity: number;
  };
  obstacles: Record<string, ObstacleBalance>;
  items: Record<string, ItemBalance>;
  camera: {
    offsetY: number;
    offsetZ: number;
    lookAheadZ: number;
    smoothing: number;
  };
  scoring: {
    stageBonus: number;
    timeBonusPerSec: number;
  };
}

export interface ObstacleBalance {
  speedPenalty: number;
  stunDuration: number;
  canJumpOver?: boolean;
  timePenalty?: number;
  lateralDrift?: number;
  hitBehavior?: 'slide' | 'trap' | 'kill';
}

export interface ItemBalance {
  score?: number;
  duration?: number;
  speedMultiplier?: number;
}

export type GameState = 'TITLE' | 'STAGE_INTRO' | 'PLAYING' | 'PAUSED' | 'STAGE_COMPLETE' | 'GAME_OVER';
