import { StageConfig, BalanceConfig } from '../config/types';

export class AssetLoader {
  async loadJSON<T>(url: string): Promise<T> {
    const response = await fetch(url);
    return response.json();
  }

  async loadStages(): Promise<StageConfig[]> {
    const data = await this.loadJSON<{ stages: StageConfig[] }>('./data/stages.json');
    return data.stages;
  }

  async loadBalance(): Promise<BalanceConfig> {
    return this.loadJSON<BalanceConfig>('./data/balance.json');
  }
}
