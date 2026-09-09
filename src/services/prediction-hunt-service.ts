/**
 * Polls Prediction Hunt for cross-platform arb and +EV (edged) markets.
 */

import { EventEmitter } from 'events';
import {
  PredictionHuntClient,
  PredictionHuntError,
  isPolymarketPlatform,
  type HuntArbOpportunity,
  type HuntEvOpportunity,
} from '../clients/prediction-hunt-client.js';

export interface HuntLegView {
  side: string;
  platform: string;
  marketId: string;
  sourceUrl?: string;
  price: number;
  liquidityUsd?: number;
  roiPct?: number;
  evUsdPerDollar?: number;
}

export interface HuntArbSignal {
  id: string;
  title: string;
  eventDate?: string;
  roiPct: number;
  totalCost: number;
  maxWagerUsd?: number;
  detectedAt?: string;
  polymarket: boolean;
  legs: HuntLegView[];
}

export interface HuntEvSignal {
  id: string;
  title: string;
  eventDate?: string;
  consensus: number;
  detectedAt?: string;
  polymarket: boolean;
  bestRoiPct: number;
  legs: HuntLegView[];
}

export interface PredictionHuntServiceConfig {
  apiKey: string;
  apiUrl?: string;
  pollMs?: number;
  arbMinRoi?: number;
  evMinRoi?: number;
  limit?: number;
}

export class PredictionHuntService extends EventEmitter {
  private client: PredictionHuntClient;
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private readonly pollMs: number;
  private readonly arbMinRoi: number;
  private readonly evMinRoi: number;
  private readonly limit: number;

  constructor(config: PredictionHuntServiceConfig) {
    super();
    this.client = new PredictionHuntClient(config.apiKey, config.apiUrl);
    this.pollMs = config.pollMs ?? 15 * 60 * 1000;
    this.arbMinRoi = config.arbMinRoi ?? 0.5;
    this.evMinRoi = config.evMinRoi ?? 1;
    this.limit = config.limit ?? 50;
  }

  isActive(): boolean {
    return this.running;
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    await this.scan();
    this.timer = setInterval(() => {
      this.scan().catch((err) => this.emit('error', err));
    }, this.pollMs);
  }

  stop(): void {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async scan(): Promise<{ arb: HuntArbSignal[]; ev: HuntEvSignal[] }> {
    this.emit('scanning');
    try {
      const [arbRes, evRes] = await Promise.all([
        this.client.getArb({ minRoi: this.arbMinRoi, limit: this.limit }),
        this.client.getEv({ minRoi: this.evMinRoi, limit: this.limit }),
      ]);

      const arb = (arbRes.opportunities || [])
        .map((opp) => this.mapArb(opp))
        .sort((a, b) => b.roiPct - a.roiPct);

      const ev = (evRes.opportunities || [])
        .map((opp) => this.mapEv(opp))
        .sort((a, b) => b.bestRoiPct - a.bestRoiPct);

      this.emit('update', { arb, ev, asOf: arbRes.as_of || evRes.as_of || new Date().toISOString() });
      return { arb, ev };
    } catch (err) {
      this.emit('error', err);
      if (err instanceof PredictionHuntError && err.isTierBlocked) {
        this.stop();
      }
      throw err;
    }
  }

  private mapArb(opp: HuntArbOpportunity): HuntArbSignal {
    const legs: HuntLegView[] = (opp.legs || []).map((leg) => ({
      side: (leg.side || '').toUpperCase(),
      platform: leg.platform,
      marketId: leg.market_id,
      sourceUrl: leg.source_url,
      price: Number(leg.price) || 0,
      liquidityUsd: leg.liquidity_usd,
    }));
    return {
      id: `arb-${opp.group_id}-${opp.detected_at || opp.group_title}`,
      title: opp.group_title,
      eventDate: opp.event_date,
      roiPct: Number(opp.roi_pct) || 0,
      totalCost: Number(opp.total_cost) || 0,
      maxWagerUsd: opp.max_wager_usd,
      detectedAt: opp.detected_at,
      polymarket: legs.some((l) => isPolymarketPlatform(l.platform)),
      legs,
    };
  }

  private mapEv(opp: HuntEvOpportunity): HuntEvSignal {
    const legs: HuntLegView[] = (opp.legs || []).map((leg) => ({
      side: (leg.side || '').toUpperCase(),
      platform: leg.platform,
      marketId: leg.market_id,
      sourceUrl: leg.source_url,
      price: Number(leg.price) || 0,
      roiPct: Number(leg.roi_pct) || 0,
      evUsdPerDollar: leg.ev_usd_per_dollar,
    }));
    const bestRoiPct = legs.reduce((max, l) => Math.max(max, l.roiPct || 0), 0);
    return {
      id: `ev-${opp.group_id}-${opp.detected_at || opp.group_title}`,
      title: opp.group_title,
      eventDate: opp.event_date,
      consensus: Number(opp.consensus_probability) || 0,
      detectedAt: opp.detected_at,
      polymarket: legs.some((l) => isPolymarketPlatform(l.platform)),
      bestRoiPct,
      legs,
    };
  }
}
