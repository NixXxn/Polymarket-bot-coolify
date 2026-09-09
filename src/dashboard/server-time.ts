/**
 * Server timezone helpers (Node). Honors TZ if set (e.g. Europe/Vienna).
 */

export interface ServerTimeInfo {
  timeZone: string;
  timeZoneName: string;
  now: string;
}

export function getServerTimeZone(): string {
  return process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function getServerTimeInfo(date = new Date()): ServerTimeInfo {
  const timeZone = getServerTimeZone();
  let timeZoneName = timeZone;
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      timeZoneName: 'short',
    }).formatToParts(date);
    timeZoneName = parts.find((p) => p.type === 'timeZoneName')?.value || timeZone;
  } catch {
    timeZoneName = timeZone;
  }
  return {
    timeZone,
    timeZoneName,
    now: date.toISOString(),
  };
}

export function formatServerDateTime(date = new Date()): string {
  const timeZone = getServerTimeZone();
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZoneName: 'short',
    }).format(date);
  } catch {
    return date.toISOString();
  }
}
