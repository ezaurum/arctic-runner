export class GameOverScreen {
  private el: HTMLElement;
  private onRestart: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.el = document.createElement('div');
    this.el.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      display: none; flex-direction: column; justify-content: center; align-items: center;
      background: rgba(0, 5, 15, 0.8);
    `;
    container.appendChild(this.el);
  }

  show(score: number, stageReached: number, reason: 'death' | 'timeUp' | 'allClear', onRestart: () => void): void {
    this.onRestart = onRestart;
    this.el.style.display = 'flex';

    const title = reason === 'allClear' ? 'ALL STAGES CLEAR!' : 'GAME OVER';
    const titleColor = reason === 'allClear' ? '#ffcc00' : '#ff4444';

    this.el.innerHTML = `
      <div style="color:${titleColor};font-size:42px;font-weight:bold;text-shadow:0 0 20px ${titleColor};margin-bottom:20px">
        ${title}
      </div>
      <div style="color:#aaa;font-size:16px;margin-bottom:8px">Stage Reached: ${stageReached}</div>
      <div style="color:#fff;font-size:28px;font-weight:bold;margin-bottom:40px">Score: ${score.toLocaleString()}</div>
      <div style="color:#88bbcc;font-size:16px;animation:blink 1.2s infinite">
        Press ENTER to Retry
      </div>
      <style>
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
      </style>
    `;
  }

  hide(): void {
    this.el.style.display = 'none';
  }

  handleInput(enter: boolean): void {
    if (enter && this.onRestart) {
      this.onRestart();
    }
  }
}
