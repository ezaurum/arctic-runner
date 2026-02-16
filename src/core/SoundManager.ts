export class SoundManager {
  private ctx: AudioContext | null = null;

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  /** Short "ding" hit sound */
  playHit(): void {
    const ctx = this.getCtx();
    const now = ctx.currentTime;

    // 3 rapid dings
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.value = 600 + i * 200; // ascending: 600, 800, 1000
      gain.gain.setValueAtTime(0.15, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.15);

      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.15);
    }
  }

  /** Collect item jingle */
  playCollect(): void {
    const ctx = this.getCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.linearRampToValueAtTime(1320, now + 0.1);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  /** Stage clear fanfare */
  playStageClear(): void {
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6

    for (let i = 0; i < notes.length; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'triangle';
      osc.frequency.value = notes[i];
      gain.gain.setValueAtTime(0.12, now + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.3);

      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.3);
    }
  }

  /** Game over low tone */
  playGameOver(): void {
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    const notes = [400, 350, 300, 200];

    for (let i = 0; i < notes.length; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sawtooth';
      osc.frequency.value = notes[i];
      gain.gain.setValueAtTime(0.08, now + i * 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.2 + 0.3);

      osc.start(now + i * 0.2);
      osc.stop(now + i * 0.2 + 0.3);
    }
  }
}
