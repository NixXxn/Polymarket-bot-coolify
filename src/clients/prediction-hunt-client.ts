/**
 * Prediction Hunt API client (v2)
 *
 * Cross-platform arb + +EV (edge vs consensus).
 * Auth: X-API-Key. Base: https://www.predictionhunt.com/api/v2
 *
 * /v2/arb and /v2/ev require Dev or Pro. Free keys get a 403 with a stable code.
 */

export const PREDICTION_HUNT_API_URL =
  process.env.PREDICTION_HUNT_API_URL || 'https://www.predictionhunt.com/api/v2';

export class PredictionHuntError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public docUrl?: string
  ) {
    super(message);
    this.name = 'PredictionHuntError';
  }

  get isTierBlocked(): boolean {
    const code = (this.code || '').toLowerCase();
    return (
      this.status === 403 ||
      code.includes('forbidden') ||
      code.includes('tier') ||
      /upgrade|not available on the free/i.test(this.message)
    );
  }
}

export interface HuntArbLeg {
  side: string;
  platform: string;
  market_id: string;
  source_url?: string;
  price: number;
  liquidity_usd?: number;
  fee_usd?: number;
}

export interface HuntArbOpportunity {
  group_id: number;
  group_title: string;
  event_date?: string;
  event_type?: string;
  roi_pct: number;
  total_cost: number;
  max_wager_usd?: number;
  detected_at?: string;
  legs: HuntArbLeg[];
}

export interface HuntEvLeg {
  platform: string;
  market_id: string;
  source_url?: string;
  side: string;
  price: number;
  roi_pct: number;
  ev_usd_per_dollar?: number;
}

export interface HuntEvOpportunity {
  group_id: number;
  group_title: string;
  event_date?: string;
  consensus_probability: number;
  detected_at?: string;
  legs: HuntEvLeg[];
}

export interface HuntArbResponse {
  as_of?: string;
  delay_seconds?: number;
  count?: number;
  opportunities: HuntArbOpportunity[];
}

export interface HuntEvResponse {
  as_of?: string;
  delay_seconds?: number;
  opportunities: HuntEvOpportunity[];
}

export function isPolymarketPlatform(platform: string | undefined): boolean {
  return (platform || '').toLowerCase().includes('polymarket');
}

export class PredictionHuntClient {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl = PREDICTION_HUNT_API_URL
  ) {}

  async getArb(params: { minRoi?: number; platforms?: string; limit?: number } = {}): Promise<HuntArbResponse> {
    const data = await this.request<HuntArbResponse>('/arb', {
      min_roi: params.minRoi ?? 0,
      platforms: params.platforms,
      limit: params.limit ?? 50,
    });
    return { ...data, opportunities: data.opportunities ?? [] };
  }

  async getEv(params: {
    minRoi?: number;
    side?: 'yes' | 'no' | 'both';
    platforms?: string;
    limit?: number;
  } = {}): Promise<HuntEvResponse> {
    const data = await this.request<HuntEvResponse>('/ev', {
      min_roi: params.minRoi ?? 0,
      side: params.side ?? 'both',
      platforms: params.platforms,
      limit: params.limit ?? 50,
    });
    return { ...data, opportunities: data.opportunities ?? [] };
  }

  private async request<T>(path: string, query: Record<string, string | number | undefined>): Promise<T> {
    const url = new URL(path.replace(/^\//, ''), this.baseUrl.endsWith('/') ? this.baseUrl : `${this.baseUrl}/`);
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === '') continue;
      url.searchParams.set(key, String(value));
    }

    const res = await fetch(url, {
      headers: {
        'X-API-Key': this.apiKey,
        Accept: 'application/json',
      },
    });

    let body: any = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }

    if (!res.ok || body?.success === false) {
      throw new PredictionHuntError(
        body?.message || body?.error || `Prediction Hunt ${res.status} ${res.statusText}`,
        res.status,
        body?.code,
        body?.doc_url
      );
    }

    return body as T;
  }
}
