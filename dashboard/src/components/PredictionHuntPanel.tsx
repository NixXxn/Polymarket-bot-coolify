import type { BotState } from '../types';
import { formatInTimeZone } from '../lib/time';
import { isPolymarketPlatform } from './huntPlatform';

interface PredictionHuntPanelProps {
  state: BotState | null;
  timeZone?: string;
}

export function PredictionHuntPanel({ state, timeZone = 'UTC' }: PredictionHuntPanelProps) {
  const hunt = state?.predictionHunt;
  const status = hunt?.status ?? 'disabled';
  const arbs = hunt?.arb ?? [];
  const evs = hunt?.ev ?? [];

  const statusStyle = ({
    live: { color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30', label: 'LIVE' },
    scanning: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', label: 'SCANNING' },
    error: { color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30', label: 'ERROR' },
    idle: { color: 'text-gray-400', bg: 'bg-gray-500/20', border: 'border-gray-500/30', label: 'IDLE' },
    disabled: { color: 'text-gray-500', bg: 'bg-gray-500/10', border: 'border-gray-500/20', label: 'OFF' },
  } as const)[status];

  return (
    <div className="panel">
      <div className="panel-header">
        <h2 className="section-header mb-0">
          <div className="section-header-icon bg-gradient-to-br from-amber-500/20 to-orange-500/20">
            🎯
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-amber-400 uppercase tracking-wider font-medium">Prediction Hunt</span>
            <span>Edge &amp; Cross-Platform Arb</span>
          </div>
        </h2>
        <div className="flex items-center gap-2">
          {hunt?.lastScan && (
            <span className="text-xs text-gray-500 font-mono">
              {formatInTimeZone(hunt.lastScan, timeZone)}
            </span>
          )}
          <span className={`badge ${statusStyle.bg} ${statusStyle.color} ${statusStyle.border} border`}>
            {statusStyle.label}
          </span>
        </div>
      </div>

      <div className="panel-body space-y-5">
        {status === 'disabled' && (
          <div className="text-sm text-gray-500 text-center py-4">
            Set <code className="text-gray-300">PREDICTION_HUNT_API_KEY</code> and enable Prediction Hunt to scan.
          </div>
        )}

        {status === 'error' && hunt?.error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-300">
            {hunt.error}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Arbs" value={arbs.length} color="text-blue-400" />
          <Stat label="Poly arbs" value={arbs.filter((a) => a.polymarket).length} color="text-cyan-400" />
          <Stat label="+EV edges" value={evs.length} color="text-amber-400" />
          <Stat label="Poly edges" value={evs.filter((e) => e.polymarket).length} color="text-green-400" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SignalList
            title="+EV (edged vs consensus)"
            empty="No +EV signals this scan"
            items={evs.slice(0, 8).map((item) => ({
              id: item.id,
              title: item.title,
              badge: `+${item.bestRoiPct.toFixed(2)}% EV`,
              badgeClass: 'badge-green',
              poly: item.polymarket,
              meta: `consensus ${(item.consensus * 100).toFixed(1)}%`,
              legs: item.legs,
            }))}
          />
          <SignalList
            title="Cross-platform arb"
            empty="No arb signals this scan"
            items={arbs.slice(0, 8).map((item) => ({
              id: item.id,
              title: item.title,
              badge: `+${item.roiPct.toFixed(2)}% ROI`,
              badgeClass: 'badge-blue',
              poly: item.polymarket,
              meta: `cost $${item.totalCost.toFixed(3)}${item.maxWagerUsd ? ` · max $${item.maxWagerUsd.toFixed(0)}` : ''}`,
              legs: item.legs,
            }))}
          />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-poly-dark/50 rounded-xl p-3 text-center">
      <div className={`text-2xl font-mono font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}

interface ListItem {
  id: string;
  title: string;
  badge: string;
  badgeClass: string;
  poly: boolean;
  meta: string;
  legs: { side: string; platform: string; price: number; sourceUrl?: string }[];
}

function SignalList({ title, empty, items }: { title: string; empty: string; items: ListItem[] }) {
  return (
    <div>
      <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">{title}</div>
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {items.length === 0 ? (
          <div className="bg-poly-dark/30 rounded-xl p-6 text-center text-sm text-gray-500">{empty}</div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="bg-poly-dark/50 rounded-xl p-3 border border-white/5">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="text-sm text-white font-medium leading-snug">{item.title}</div>
                <span className={`badge ${item.badgeClass} flex-shrink-0`}>{item.badge}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                {item.poly && <span className="text-cyan-400">Polymarket</span>}
                <span>{item.meta}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {item.legs.map((leg, i) => {
                  const poly = isPolymarketPlatform(leg.platform);
                  const inner = (
                    <>
                      {leg.platform} {leg.side} @{leg.price.toFixed(3)}
                    </>
                  );
                  const cls = `text-[10px] px-2 py-0.5 rounded-md font-mono ${
                    poly ? 'bg-cyan-500/15 text-cyan-300' : 'bg-white/5 text-gray-400'
                  }`;
                  return leg.sourceUrl ? (
                    <a key={i} href={leg.sourceUrl} target="_blank" rel="noreferrer" className={cls}>
                      {inner}
                    </a>
                  ) : (
                    <span key={i} className={cls}>{inner}</span>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
