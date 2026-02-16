export class InputManager {
  private keys = new Set<string>();
  private justPressed = new Set<string>();

  constructor() {
    window.addEventListener('keydown', (e) => {
      if (!this.keys.has(e.code)) {
        this.justPressed.add(e.code);
      }
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
  }

  isDown(code: string): boolean {
    return this.keys.has(code);
  }

  wasPressed(code: string): boolean {
    return this.justPressed.has(code);
  }

  get left(): boolean {
    return this.isDown('ArrowLeft') || this.isDown('KeyA');
  }

  get right(): boolean {
    return this.isDown('ArrowRight') || this.isDown('KeyD');
  }

  get up(): boolean {
    return this.isDown('ArrowUp') || this.isDown('KeyW');
  }

  get jump(): boolean {
    return this.wasPressed('Space');
  }

  get enter(): boolean {
    return this.wasPressed('Enter');
  }

  /** Clear all buffered input — call on state transitions */
  flush(): void {
    this.justPressed.clear();
    this.keys.clear();
  }

  endFrame(): void {
    this.justPressed.clear();
  }
}
