type Listener = (...args: any[]) => void;

export class EventBus {
  private listeners = new Map<string, Listener[]>();

  on(event: string, listener: Listener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  off(event: string, listener: Listener): void {
    const list = this.listeners.get(event);
    if (list) {
      const idx = list.indexOf(listener);
      if (idx >= 0) list.splice(idx, 1);
    }
  }

  emit(event: string, ...args: any[]): void {
    const list = this.listeners.get(event);
    if (list) {
      for (const fn of list) fn(...args);
    }
  }
}
