export class StageIntro {
  private el: HTMLElement;
  private timer = 0;
  private duration = 2.5;
  private onDone: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.el = document.createElement('div');
    this.el.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      display: none; flex-direction: column; justify-content: center; align-items: center;
      background: rgba(0, 10, 30, 0.6);
      transition: opacity 0.5s;
    `;
    container.appendChild(this.el);
  }

  show(stageId: number, stageName: string, onDone: () => void): void {
    this.timer = 0;
    this.onDone = onDone;
    this.el.style.display = 'flex';
    this.el.style.opacity = '1';
    this.el.innerHTML = `
      <div style="color:#88bbcc;font-size:18px;letter-spacing:3px;margin-bottom:8px">STAGE ${stageId}</div>
      <div style="color:#fff;font-size:36px;font-weight:bold;text-shadow:0 0 15px #4af">${stageName}</div>
      <div style="color:#667;font-size:14px;margin-top:20px">Get Ready!</div>
    `;
  }

  update(dt: number): void {
    if (this.el.style.display === 'none') return;
    this.timer += dt;
    if (this.timer > this.duration - 0.5) {
      this.el.style.opacity = String(Math.max(0, (this.duration - this.timer) * 2));
    }
    if (this.timer >= this.duration) {
      this.el.style.display = 'none';
      if (this.onDone) this.onDone();
    }
  }

  hide(): void {
    this.el.style.display = 'none';
  }
}
