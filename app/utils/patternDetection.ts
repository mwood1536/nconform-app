import { Audit, DetectedPattern, NCR, PatternsCache } from '../types';
import { detectPatterns, DetectedPatternRaw } from './apiHelpers';
import { generateId, nowISO } from './ncrHelpers';
import { Storage } from './storage';

const NINETY_DAYS_MS = 90 * 24 * 3600_000;
const CACHE_MS = 24 * 3600_000;

function ninetyDayCutoffISO(): string {
  return new Date(Date.now() - NINETY_DAYS_MS).toISOString();
}

function hashSource(ncrs: NCR[], audits: Audit[]): string {
  // Tiny stable hash of "what data the cache covers" so we invalidate when
  // new NCRs or audits land even if the 24h window hasn't elapsed.
  const parts = [
    `n:${ncrs.length}`,
    `n_last:${ncrs[0]?.updatedAt ?? ''}`,
    `a:${audits.length}`,
    `a_last:${audits[0]?.completedAt ?? audits[0]?.createdAt ?? ''}`,
  ];
  return parts.join('|');
}

export function isCacheFresh(cache: PatternsCache | null, sourceHash: string): boolean {
  if (!cache) return false;
  if (cache.sourceHash !== sourceHash) return false;
  return new Date(cache.cachedUntil).getTime() > Date.now();
}

export async function loadCachedPatterns(): Promise<PatternsCache | null> {
  return Storage.getPatternsCache();
}

export async function refreshPatterns(
  ncrs: NCR[],
  audits: Audit[],
): Promise<PatternsCache> {
  const cutoff = ninetyDayCutoffISO();
  const recentNcrs = ncrs.filter((n) => n.createdAt >= cutoff);
  const recentAudits = audits.filter((a) => (a.completedAt ?? a.createdAt) >= cutoff);

  const ncrSummaries = recentNcrs.slice(0, 40).map((n) => ({
    id: n.ncrNumber || n.id,
    title: n.title,
    description: n.description.slice(0, 200),
    department: n.department,
    severity: n.severity,
    createdAt: n.createdAt,
    rootCause: n.correctiveAction?.rootCause,
  }));

  const auditFailures: Array<{
    auditName: string;
    layer: string;
    failedPrompt: string;
    createdAt: string;
  }> = [];
  for (const a of recentAudits.slice(0, 25)) {
    for (const r of a.responses) {
      if (r.result !== 'Fail') continue;
      const q = a.questions.find((x) => x.id === r.questionId);
      if (!q) continue;
      auditFailures.push({
        auditName: a.name,
        layer: a.layer,
        failedPrompt: q.prompt,
        createdAt: a.completedAt ?? a.createdAt,
      });
    }
  }

  let raw: DetectedPatternRaw[] = [];
  try {
    raw = await detectPatterns({ ncrSummaries, auditFailures });
  } catch {
    raw = [];
  }
  const patterns: DetectedPattern[] = raw.map((p) => ({
    id: generateId('pat'),
    title: p.title,
    summary: p.summary,
    count: p.count,
    relatedNcrIds: p.relatedNcrIds,
    suggestedAction: p.suggestedAction,
    severity: p.severity,
  }));

  const cache: PatternsCache = {
    generatedAt: nowISO(),
    cachedUntil: new Date(Date.now() + CACHE_MS).toISOString(),
    patterns,
    sourceHash: hashSource(ncrs, audits),
  };
  await Storage.setPatternsCache(cache);
  return cache;
}

export { hashSource };
