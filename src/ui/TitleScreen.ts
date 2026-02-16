export class TitleScreen {
  private el: HTMLElement;
  private onStart: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.el = document.createElement('div');
    this.el.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      display: flex; flex-direction: column; justify-content: center; align-items: center;
      background: rgba(0, 10, 30, 0.75);
    `;
    this.el.innerHTML = `
      <h1 style="font-size:48px;color:#aaeeff;text-shadow:0 0 20px #4af;margin-bottom:8px;letter-spacing:4px">
        ARCTIC RUNNER
      </h1>
      <p style="color:#88bbcc;font-size:14px;margin-bottom:40px">
        An Antarctic Adventure Homage
      </p>
      <div style="color:#fff;font-size:18px;animation:blink 1.2s infinite">
        Press ENTER or SPACE to Start
      </div>
      <div style="color:#667;font-size:12px;margin-top:30px">
        Arrow Keys / WASD to move | SPACE to jump
      </div>
      <style>
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
      </style>
    `;
    container.appendChild(this.el);
  }

  show(onStart: () => void): void {
    this.onStart = onStart;
    this.el.style.display = 'flex';
  }

  hide(): void {
    this.el.style.display = 'none';
    this.onStart = null;
  }

  handleInput(enter: boolean): void {
    if (enter && this.onStart) {
      this.onStart();
    }
  }
}
