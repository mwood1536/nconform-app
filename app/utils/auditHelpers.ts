import {
  Audit,
  AuditQuestion,
  AuditResponse,
  AuditTemplate,
  ScheduledAudit,
} from '../types';
import { AuditLayer } from '../constants/standards';

// Seeded RNG so an audit drawn from a question bank can be replayed later
// against the same seed and produce the same sample for traceability.
function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

export function newRandomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff);
}

export function sampleQuestions(
  bank: AuditQuestion[],
  sampleSize: number,
  seed: number,
): AuditQuestion[] {
  if (bank.length === 0) return [];
  const size = Math.min(Math.max(1, sampleSize), bank.length);
  const rng = seededRandom(seed);
  const pool = bank.map((q) => ({ ...q }));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  return pool.slice(0, size);
}

export function computePassRates(
  questions: AuditQuestion[],
  responses: AuditResponse[],
): { pass: number; weighted: number } {
  const scored = responses.filter((r) => r.result === 'Pass' || r.result === 'Fail');
  if (scored.length === 0) return { pass: 0, weighted: 0 };
  const passCount = scored.filter((r) => r.result === 'Pass').length;
  const pass = Math.round((passCount / scored.length) * 100);
  const weightOf = (qid: string): number => {
    const q = questions.find((x) => x.id === qid);
    return q?.weight ?? 1;
  };
  const totalWeight = scored.reduce((acc, r) => acc + weightOf(r.questionId), 0);
  if (totalWeight === 0) return { pass, weighted: pass };
  const passWeight = scored
    .filter((r) => r.result === 'Pass')
    .reduce((acc, r) => acc + weightOf(r.questionId), 0);
  const weighted = Math.round((passWeight / totalWeight) * 100);
  return { pass, weighted };
}

export function layerLevelOf(layer: AuditLayer): number {
  if (layer.includes('Layer 3')) return 3;
  if (layer.includes('Layer 2')) return 2;
  return 1;
}

export function nextLayerLabel(current: AuditLayer): AuditLayer | null {
  const lvl = layerLevelOf(current);
  if (lvl === 1) return 'Layer 2 — Supervisor';
  if (lvl === 2) return 'Layer 3 — Manager';
  return null;
}

// Layer 1 fail → schedule Layer 2 within 48h. Layer 2 fail → Layer 3 within 24h.
export function escalationHoursFor(nextLevel: number): number {
  return nextLevel === 2 ? 48 : 24;
}

export function emptyResponse(questionId: string): AuditResponse {
  return {
    questionId,
    result: null,
    note: '',
    photo: null,
    followUpAnswer: '',
    followUpPhoto: null,
  };
}

export function questionsForAudit(
  template: AuditTemplate,
  seed: number,
): { questions: AuditQuestion[]; seed: number | null } {
  if (template.mode === 'random') {
    return {
      questions: sampleQuestions(template.questionBank, template.sampleSize, seed),
      seed,
    };
  }
  return { questions: template.questions.map((q) => ({ ...q })), seed: null };
}

export function scheduleStatus(
  scheduled: ScheduledAudit,
  nowMs: number = Date.now(),
): ScheduledAudit['status'] {
  if (scheduled.status === 'Completed' || scheduled.status === 'Cancelled') {
    return scheduled.status;
  }
  const due = new Date(scheduled.dueDate).getTime();
  return Number.isFinite(due) && due < nowMs ? 'Overdue' : 'Upcoming';
}

// Conditional follow-up: when a question is Fail and has a follow-up rule,
// any required note/photo must be filled before the audit can be marked done.
export function followUpsSatisfied(
  questions: AuditQuestion[],
  responses: AuditResponse[],
): { ok: boolean; missingPrompts: string[] } {
  const missing: string[] = [];
  for (const q of questions) {
    if (!q.followUpOnFail) continue;
    const r = responses.find((x) => x.questionId === q.id);
    if (!r || r.result !== 'Fail') continue;
    if (q.followUpOnFail.requireNote && !r.followUpAnswer.trim()) {
      missing.push(q.prompt);
    }
    if (q.followUpOnFail.requirePhoto && !r.followUpPhoto) {
      missing.push(q.prompt);
    }
  }
  return { ok: missing.length === 0, missingPrompts: Array.from(new Set(missing)) };
}
