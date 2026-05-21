import { Audit, NCR } from '../types';

const DAY_MS = 24 * 3600_000;

export function ncrCountByWeek(ncrs: NCR[], weeks: number = 4): {
  values: number[];
  labels: string[];
} {
  const now = Date.now();
  const buckets = new Array(weeks).fill(0) as number[];
  const labels: string[] = [];
  for (let i = 0; i < weeks; i++) {
    const start = now - (weeks - i) * 7 * DAY_MS;
    const end = start + 7 * DAY_MS;
    buckets[i] = ncrs.filter((n) => {
      const t = new Date(n.createdAt).getTime();
      return t >= start && t < end;
    }).length;
    labels.push(`W${i + 1}`);
  }
  return { values: buckets, labels };
}

export function passRateByWeek(
  audits: Audit[],
  weeks: number = 12,
): { values: number[]; labels: string[] } {
  const now = Date.now();
  const values: number[] = [];
  const labels: string[] = [];
  for (let i = 0; i < weeks; i++) {
    const start = now - (weeks - i) * 7 * DAY_MS;
    const end = start + 7 * DAY_MS;
    const inWeek = audits.filter((a) => {
      if (a.status !== 'Completed') return false;
      const ts = a.completedAt ?? a.createdAt;
      const t = new Date(ts).getTime();
      return t >= start && t < end;
    });
    if (inWeek.length === 0) {
      // Carry forward previous value or 0 to keep the chart continuous.
      values.push(values[values.length - 1] ?? 0);
    } else {
      const avg =
        inWeek.reduce((s, a) => s + (a.weightedPassRate || a.passRate), 0) / inWeek.length;
      values.push(Math.round(avg));
    }
    labels.push(`W${i + 1}`);
  }
  return { values, labels };
}

export function openActionsTrend(ncrs: NCR[]): { current: number; previous: number } {
  const now = Date.now();
  const monthAgo = now - 30 * DAY_MS;
  let current = 0;
  let previous = 0;
  for (const n of ncrs) {
    for (const a of n.actions) {
      if (a.status === 'Completed') continue;
      const t = new Date(a.createdAt).getTime();
      if (t >= monthAgo) current++;
      else previous++;
    }
  }
  return { current: current + previous, previous: previous };
}

export function activityAgeDays(ncrs: NCR[]): number {
  if (ncrs.length === 0) return 0;
  const oldest = ncrs.reduce(
    (acc, n) => Math.min(acc, new Date(n.createdAt).getTime()),
    Date.now(),
  );
  return Math.floor((Date.now() - oldest) / DAY_MS);
}
