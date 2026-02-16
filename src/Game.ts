import { SceneManager } from './scene/SceneManager';
import { CameraController } from './scene/CameraController';
import { RoadManager } from './scene/RoadManager';
import { GroundManager } from './scene/GroundManager';
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
import { HUD } from './ui/HUD';
import { TitleScreen } from './ui/TitleScreen';
import { StageIntro } from './ui/StageIntro';
import { GameOverScreen } from './ui/GameOverScreen';
import { GameState, StageConfig, BalanceConfig } from './config/types';

export class Game {
  private sceneManager: SceneManager;
  private cameraController: CameraController;
  private roadManager: RoadManager;
  private groundManager: GroundManager;
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

  private hud: HUD;
  private titleScreen: TitleScreen;
  private stageIntro: StageIntro;
  private gameOverScreen: GameOverScreen;

  private state: GameState = 'TITLE';
  private stages: StageConfig[] = [];
  private balance!: BalanceConfig;
  private lastTime = 0;

  constructor(container: HTMLElement) {
    const uiOverlay = container.querySelector('#ui-overlay') as HTMLElement;

    this.eventBus = new EventBus();
    this.input = new InputManager();
    this.sceneManager = new SceneManager(container);
    this.cameraController = new CameraController(this.sceneManager.camera);

    this.roadManager = new RoadManager(this.sceneManager.scene, this.eventBus);
    this.groundManager = new GroundManager(this.sceneManager.scene);
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

    this.setState('TITLE');
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  private setState(newState: GameState): void {
    this.state = newState;

    this.hud.hide();
    this.titleScreen.hide();
    this.stageIntro.hide();
    this.gameOverScreen.hide();

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
        this.gameOverScreen.show(
          this.scoreSystem.score,
          this.stageSystem.stageIndex + 1,
          'death',
          () => this.restartGame()
        );
        break;
    }
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
    this.groundManager.reset();
    this.penguin.reset();
    this.penguin.configure(this.balance.penguin);
    this.sceneManager.setFog(stage.environment.fogNear, stage.environment.fogFar);
    this.skyManager.createSnowParticles(stage.environment.snowIntensity);
    this.stageSystem.startStage(this.stageSystem.stageIndex, this.penguin.position.z);
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
    this.groundManager.update(this.penguin.position.z);
    this.cameraController.update(this.penguin.position, dt);
    this.skyManager.update(this.penguin.position.z, dt);
    this.collisionSystem.update();
    this.collectibleFactory.updateAll(dt);
    this.obstacleFactory.recycleFarBehind(this.penguin.position.z);
    this.collectibleFactory.recycleFarBehind(this.penguin.position.z);

    // Stage progress
    const stageResult = this.stageSystem.update(dt, this.penguin.position.z);

    // Update HUD
    this.hud.updateScore(this.scoreSystem.score);
    this.hud.updateTimer(this.stageSystem.remainingTime);
    this.hud.updateSpeed(this.penguin.speed);
    this.hud.updateLives(this.penguin.lives);
    this.hud.updateProgress(this.stageSystem.progress);

    // Check game state transitions
    if (this.penguin.lives <= 0) {
      this.setState('GAME_OVER');
    } else if (stageResult === 'complete') {
      this.setState('STAGE_COMPLETE');
    } else if (stageResult === 'timeUp') {
      this.penguin.lives = 0;
      this.setState('GAME_OVER');
    }
  }
}
