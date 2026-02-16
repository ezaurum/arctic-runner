import { BalanceConfig } from '../config/types';
import { EventBus } from '../core/EventBus';

export class ScoreSystem {
  score = 0;
  private balance: BalanceConfig | null = null;

  constructor(eventBus: EventBus) {
    eventBus.on('collectItem', (type: string) => {
      if (!this.balance) return;
      const itemBalance = this.balance.items[type];
      if (itemBalance?.score) {
        this.score += itemBalance.score;
      }
    });
  }

  configure(balance: BalanceConfig): void {
    this.balance = balance;
  }

  addStageBonus(remainingTime: number): void {
    if (!this.balance) return;
    this.score += this.balance.scoring.stageBonus;
    this.score += Math.floor(remainingTime) * this.balance.scoring.timeBonusPerSec;
  }

  reset(): void {
    this.score = 0;
  }
}
