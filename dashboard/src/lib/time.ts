export interface ServerTimeInfo {
  timeZone: string;
  timeZoneName: string;
  now: string;
}

const TIME_ONLY: Intl.DateTimeFormatOptions = {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
};

export function formatInTimeZone(
  value: string | number | Date,
  timeZone: string,
  options: Intl.DateTimeFormatOptions = TIME_ONLY
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '--:--:--';
  try {
    return date.toLocaleString('en-GB', { timeZone, ...options });
  } catch {
    return date.toLocaleString('en-GB', options);
  }
}

export function formatClockDate(date: Date, timeZone: string): string {
  return formatInTimeZone(date, timeZone, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function zoneAbbreviation(date: Date, timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      timeZoneName: 'short',
    }).formatToParts(date);
    return parts.find((p) => p.type === 'timeZoneName')?.value || timeZone;
  } catch {
    return timeZone;
  }
}
