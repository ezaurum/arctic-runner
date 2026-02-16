export class HUD {
  private container: HTMLElement;
  private el: HTMLElement;

  private scoreEl!: HTMLElement;
  private timerEl!: HTMLElement;
  private speedEl!: HTMLElement;
  private livesEl!: HTMLElement;
  private progressEl!: HTMLElement;
  private stageEl!: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.el = document.createElement('div');
    this.el.id = 'hud';
    this.el.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; padding: 12px 20px;
      display: flex; justify-content: space-between; align-items: flex-start;
      font-size: 16px; color: #fff; text-shadow: 1px 1px 2px rgba(0,0,0,0.7);
      pointer-events: none;
    `;
    this.el.innerHTML = `
      <div>
        <div id="hud-stage" style="font-size:14px;opacity:0.8">Stage 1</div>
        <div id="hud-score" style="font-size:22px;font-weight:bold">0</div>
      </div>
      <div style="text-align:center">
        <div id="hud-timer" style="font-size:28px;font-weight:bold">120</div>
        <div id="hud-progress" style="width:200px;height:6px;background:rgba(255,255,255,0.3);border-radius:3px;margin-top:4px">
          <div style="width:0%;height:100%;background:#4af;border-radius:3px;transition:width 0.3s"></div>
        </div>
      </div>
      <div style="text-align:right">
        <div id="hud-lives">❤❤❤</div>
        <div id="hud-speed" style="font-size:14px;opacity:0.8">30 km/h</div>
      </div>
    `;
    this.container.appendChild(this.el);

    this.scoreEl = this.el.querySelector('#hud-score')!;
    this.timerEl = this.el.querySelector('#hud-timer')!;
    this.speedEl = this.el.querySelector('#hud-speed')!;
    this.livesEl = this.el.querySelector('#hud-lives')!;
    this.progressEl = this.el.querySelector('#hud-progress')!;
    this.stageEl = this.el.querySelector('#hud-stage')!;
  }

  updateScore(score: number): void {
    this.scoreEl.textContent = score.toLocaleString();
  }

  updateTimer(seconds: number): void {
    const s = Math.ceil(seconds);
    this.timerEl.textContent = String(s);
    this.timerEl.style.color = s <= 10 ? '#f44' : '#fff';
  }

  updateSpeed(speed: number): void {
    this.speedEl.textContent = `${Math.floor(speed)} km/h`;
  }

  updateLives(lives: number): void {
    this.livesEl.textContent = '❤'.repeat(Math.max(0, lives));
  }

  updateProgress(progress: number): void {
    const bar = this.progressEl.firstElementChild as HTMLElement;
    bar.style.width = `${Math.floor(progress * 100)}%`;
  }

  updateStage(name: string): void {
    this.stageEl.textContent = name;
  }

  show(): void {
    this.el.style.display = 'flex';
  }

  hide(): void {
    this.el.style.display = 'none';
  }
}
