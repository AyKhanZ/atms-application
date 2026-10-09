export type RelativeUnit = 'minute' | 'hour' | 'day';

type Translate = (key: string, params?: Record<string, string | number>) => string;

const keys: Record<RelativeUnit, { ago: string; ahead: string }> = {
  minute: { ago: 'time.minutesAgo', ahead: 'time.inMinutes' },
  hour: { ago: 'time.hoursAgo', ahead: 'time.inHours' },
  day: { ago: 'time.daysAgo', ahead: 'time.inDays' },
};

// "5 minutes ago" / "in 2 days"; a negative count is the past.
// Intl.RelativeTimeFormat has no azerbaijani words in chrome and writes "-10 h", so they come from time.*
export function relativePhrase(count: number, unit: RelativeUnit, translate: Translate): string {
  const key = count < 0 ? keys[unit].ago : keys[unit].ahead;
  return translate(key, { count: Math.abs(count) });
}
