import { useEffect, useState } from 'react';
import { formatClockDate, formatInTimeZone, zoneAbbreviation } from '../lib/time';

interface ServerClockProps {
  timeZone: string;
  timeZoneName?: string;
}

export function ServerClock({ timeZone, timeZoneName }: ServerClockProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const abbrev = timeZoneName || zoneAbbreviation(now, timeZone);

  return (
    <div className="px-4 py-2.5 border-b border-white/5 bg-poly-dark/40 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wider">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
        Server time
      </div>
      <div className="font-mono text-xl text-white tabular-nums tracking-wide">
        {formatInTimeZone(now, timeZone)}
      </div>
      <div className="text-xs text-gray-400 text-right">
        <span className="text-cyan-300 font-medium">{abbrev}</span>
        <span className="mx-1.5 text-gray-600">·</span>
        {formatClockDate(now, timeZone)}
        <span className="mx-1.5 text-gray-600">·</span>
        <span className="font-mono text-gray-500">{timeZone}</span>
      </div>
    </div>
  );
}
