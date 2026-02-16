import { SceneManager } from './scene/SceneManager';
import { CameraController } from './scene/CameraController';
import { RoadManager } from './scene/RoadManager';
import { SkyManager } from './scene/SkyManager';
import { Penguin } from './entities/Penguin';
import { ObstacleFactory } from './entities/ObstacleFactory';
import { CollectibleFactory } from './entities/CollectibleFactory';
import { CollisionSystem } from './systems/CollisionSystem';
import { SpawnSystem } from './systems/SpawnSystem';
import { ScoreSystem } from './systems/ScoreSystem';
import { StageSystem } from './systems/StageSystem';
import { InputManager } from './core/InputManager';
import { AssetLoader } from './core/AssetLoader';
import { EventBus } from './core/EventBus';
import { SoundManager } from './core/SoundManager';
import { HUD } from './ui/HUD';
import { TitleScreen } from './ui/TitleScreen';
import { StageIntro } from './ui/StageIntro';
import { GameOverScreen } from './ui/GameOverScreen';
import { GameState, StageConfig, BalanceConfig } from './config/types';

export class Game {
  private sceneManager: SceneManager;
  private cameraController: CameraController;
  private roadManager: RoadManager;
  private skyManager: SkyManager;
  private penguin: Penguin;
  private obstacleFactory: ObstacleFactory;
  private collectibleFactory: CollectibleFactory;
  private collisionSystem: CollisionSystem;
  private spawnSystem: SpawnSystem;
  private scoreSystem: ScoreSystem;
  private stageSystem: StageSystem;
  private input: InputManager;
  private eventBus: EventBus;
  private sound: SoundManager;

  private hud: HUD;
  private titleScreen: TitleScreen;
  private stageIntro: StageIntro;
  private gameOverScreen: GameOverScreen;

  private state: GameState = 'TITLE';
  private stateBeforePause: GameState = 'TITLE';
  private stages: StageConfig[] = [];
  private balance!: BalanceConfig;
  private lastTime = 0;
  private pauseOverlay: HTMLElement;

  constructor(container: HTMLElement) {
    const uiOverlay = container.querySelector('#ui-overlay') as HTMLElement;

    this.eventBus = new EventBus();
    this.input = new InputManager();
    this.sound = new SoundManager();
    this.sceneManager = new SceneManager(container);
    this.cameraController = new CameraController(this.sceneManager.camera);

    this.roadManager = new RoadManager(this.sceneManager.scene, this.eventBus);
    this.skyManager = new SkyManager(this.sceneManager.scene);

    this.penguin = new Penguin();
    this.sceneManager.scene.add(this.penguin.mesh);

    this.obstacleFactory = new ObstacleFactory(this.sceneManager.scene);
    this.collectibleFactory = new CollectibleFactory(this.sceneManager.scene);

    this.collisionSystem = new CollisionSystem(
      this.penguin, this.obstacleFactory, this.collectibleFactory, this.eventBus
    );
    this.spawnSystem = new SpawnSystem(
      this.obstacleFactory, this.collectibleFactory, this.eventBus
    );
    this.scoreSystem = new ScoreSystem(this.eventBus);
    this.stageSystem = new StageSystem(this.eventBus);

    this.hud = new HUD(uiOverlay);
    this.titleScreen = new TitleScreen(uiOverlay);
    this.stageIntro = new StageIntro(uiOverlay);
    this.gameOverScreen = new GameOverScreen(uiOverlay);

    // Pause overlay
    this.pauseOverlay = document.createElement('div');
    this.pauseOverlay.style.cssText = `
      position:absolute;top:0;left:0;width:100%;height:100%;
      display:none;flex-direction:column;justify-content:center;align-items:center;
      background:rgba(0,5,15,0.7);
    `;
    this.pauseOverlay.innerHTML = `
      <div style="color:#aaeeff;font-size:36px;font-weight:bold;text-shadow:0 0 15px #4af;margin-bottom:20px">PAUSED</div>
      <div style="color:#88bbcc;font-size:16px">Press ENTER to Resume</div>
    `;
    uiOverlay.appendChild(this.pauseOverlay);

    // Auto-pause on focus loss
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && (this.state === 'PLAYING' || this.state === 'STAGE_INTRO')) {
        this.pause();
      }
    });
    window.addEventListener('blur', () => {
      if (this.state === 'PLAYING' || this.state === 'STAGE_INTRO') {
        this.pause();
      }
    });

    // Live tuning: receive balance updates from tuning tool
    window.addEventListener('message', (e) => {
      if (e.data?.type === 'tuning-update' && e.data.balance) {
        this.applyLiveBalance(e.data.balance);
      }
    });
  }

  async init(): Promise<void> {
    const loader = new AssetLoader();
    this.stages = await loader.loadStages();
    this.balance = await loader.loadBalance();

    this.penguin.configure(this.balance.penguin);
    this.cameraController.configure(this.balance.camera);
    this.collisionSystem.configure(this.balance);
    this.scoreSystem.configure(this.balance);
    this.stageSystem.configure(this.stages);
    this.sceneManager.configureRendering(this.balance.rendering);
    this.roadManager.configureRendering(this.balance.rendering);

    // Wire up sound effects
    this.eventBus.on('obstacleHit', () => this.sound.playHit());
    this.eventBus.on('collectItem', () => this.sound.playCollect());

    this.setState('TITLE');
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  private setState(newState: GameState): void {
    this.state = newState;
    this.input.flush();

    this.hud.hide();
    this.titleScreen.hide();
    this.stageIntro.hide();
    this.gameOverScreen.hide();
    this.pauseOverlay.style.display = 'none';

    switch (newState) {
      case 'TITLE':
        this.titleScreen.show(() => this.startGame());
        break;

      case 'STAGE_INTRO': {
        const stage = this.stageSystem.currentStage!;
        this.hud.show();
        this.hud.updateStage(stage.name);
        this.stageIntro.show(stage.id, stage.name, () => {
          this.setState('PLAYING');
        });
        break;
      }

      case 'PLAYING':
        this.hud.show();
        break;

      case 'STAGE_COMPLETE': {
        this.sound.playStageClear();
        const remaining = this.stageSystem.remainingTime;
        this.scoreSystem.addStageBonus(remaining);

        if (this.stageSystem.hasNextStage) {
          this.stageSystem.advanceStage();
          this.setupStage();
          this.setState('STAGE_INTRO');
        } else {
          this.setState('GAME_OVER');
          this.gameOverScreen.show(
            this.scoreSystem.score,
            this.stageSystem.stageIndex + 1,
            'allClear',
            () => this.restartGame()
          );
        }
        break;
      }

      case 'GAME_OVER':
        this.sound.playGameOver();
        this.gameOverScreen.show(
          this.scoreSystem.score,
          this.stageSystem.stageIndex + 1,
          'death',
          () => this.restartGame()
        );
        break;
    }
  }

  private pause(): void {
    if (this.state === 'PAUSED') return;
    this.stateBeforePause = this.state;
    this.state = 'PAUSED';
    this.input.flush();
    this.pauseOverlay.style.display = 'flex';
  }

  private resume(): void {
    this.state = this.stateBeforePause;
    this.input.flush();
    this.lastTime = performance.now();
    this.pauseOverlay.style.display = 'none';
  }

  private startGame(): void {
    this.scoreSystem.reset();
    this.stageSystem.reset();
    this.penguin.reset();
    this.penguin.configure(this.balance.penguin);
    this.setupStage();
    this.setState('STAGE_INTRO');
  }

  private setupStage(): void {
    const stage = this.stageSystem.currentStage!;
    this.roadManager.configureStage(stage);
    this.spawnSystem.configureStage(stage);
    this.spawnSystem.reset();
    this.roadManager.reset();
    this.penguin.reset();
    this.penguin.configure(this.balance.penguin);
    this.sceneManager.setFog(stage.environment.fogNear, stage.environment.fogFar);
    this.skyManager.createSnowParticles(stage.environment.snowIntensity);
    this.stageSystem.startStage(this.stageSystem.stageIndex, this.penguin.position.z);
  }

  private applyLiveBalance(balance: BalanceConfig): void {
    this.balance = balance;
    this.penguin.configure(balance.penguin);
    this.cameraController.configure(balance.camera);
    this.collisionSystem.configure(balance);
    this.scoreSystem.configure(balance);
    if (balance.rendering) {
      this.sceneManager.configureRendering(balance.rendering);
      this.roadManager.configureRendering(balance.rendering);
    }
  }

  private restartGame(): void {
    this.startGame();
  }

  private loop(time: number): void {
    requestAnimationFrame((t) => this.loop(t));

    const dt = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;

    this.update(dt);
    this.sceneManager.render();
    this.input.endFrame();
  }

  private update(dt: number): void {
    switch (this.state) {
      case 'TITLE':
        this.titleScreen.handleInput(this.input.enter);
        break;

      case 'STAGE_INTRO':
        this.stageIntro.update(dt);
        this.cameraController.update(this.penguin.position, dt);
        break;

      case 'PLAYING':
        this.updatePlaying(dt);
        break;

      case 'PAUSED':
        if (this.input.enter) {
          this.resume();
        }
        break;

      case 'GAME_OVER':
        this.gameOverScreen.handleInput(this.input.enter);
        break;
    }
  }

  private updatePlaying(dt: number): void {
    const roadCurveX = this.roadManager.getCurveXAt(Math.abs(this.penguin.position.z));
    const roadElevation = this.roadManager.getElevationAt(Math.abs(this.penguin.position.z));

    this.penguin.update(dt, this.input, roadCurveX, roadElevation);
    this.roadManager.update(this.penguin.position.z);
    this.cameraController.update(this.penguin.position, dt);
    this.sceneManager.updateLightPosition(this.penguin.position);
    this.skyManager.update(this.penguin.position.z, dt);
    this.collisionSystem.update();
    this.obstacleFactory.updateAll(dt, this.penguin.position.z);
    this.collectibleFactory.updateAll(dt);
    this.obstacleFactory.recycleFarBehind(this.penguin.position.z);
    this.collectibleFactory.recycleFarBehind(this.penguin.position.z);

    // Stage progress
    const stageResult = this.stageSystem.update(dt, this.penguin.position.z);

    // Update HUD
    this.hud.updateScore(this.scoreSystem.score);
    this.hud.updateTimer(this.stageSystem.remainingTime);
    this.hud.updateSpeed(this.penguin.speed);
    this.hud.updateProgress(this.stageSystem.progress);

    // Check game state transitions
    if (this.penguin.dead) {
      this.setState('GAME_OVER');
    } else if (stageResult === 'complete') {
      this.setState('STAGE_COMPLETE');
    } else if (stageResult === 'timeUp') {
      this.setState('GAME_OVER');
    }
  }
}
