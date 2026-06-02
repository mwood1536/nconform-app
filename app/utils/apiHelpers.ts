import { AIcorrectiveActionResponse, NCR } from '../types';
import { ensureOnlineForAI } from './network';

const ANTHROPIC_MODEL = 'claude-sonnet-4-6';

const SYSTEM_PROMPT =
  'You are a quality management expert specializing in ISO 9001, IATF 16949, and AS9100 corrective action documentation. Generate a professional, audit-ready corrective action report in JSON format based on the nonconformance details provided. Return only valid JSON with these exact keys: problemStatement, containmentAction, rootCause, correctiveAction, preventiveAction, standardReference, verificationMethod. Be specific, professional, and reference the appropriate quality standard clause.';

interface AnthropicTextBlock {
  type: 'text';
  text: string;
}

interface AnthropicMessageResponse {
  content: AnthropicTextBlock[];
}

// All AI requests are routed exclusively through the IronStratos proxy
// (rootcauseai-proxy) configured via EXPO_PUBLIC_PROXY_URL. The proxy injects
// the Anthropic API key server-side. We never ship an API key in the app or
// call api.anthropic.com directly — EXPO_PUBLIC_* vars are bundled into the
// shipped APK and would be extractable by anyone.
function getProxyUrl(): string | null {
  const url = process.env.EXPO_PUBLIC_PROXY_URL;
  return url && url.length > 0 ? url : null;
}

function buildUserPrompt(ncr: NCR, profileStandard: string): string {
  return [
    `Standard in use: ${profileStandard || 'Not specified'}`,
    `NCR Number: ${ncr.ncrNumber}`,
    `Title: ${ncr.title}`,
    `Severity: ${ncr.severity}`,
    `Detection Point: ${ncr.detectionPoint}`,
    `Standard Reference Type: ${ncr.standardRef}`,
    `Description: ${ncr.description}`,
    `Containment Action Already Taken: ${ncr.containmentAction || 'None recorded'}`,
    `Assigned To: ${ncr.assignedTo || 'Unassigned'}`,
    `Due Date: ${ncr.dueDate || 'Not set'}`,
    '',
    'Generate the corrective action report as JSON.',
  ].join('\n');
}

function extractJSON(text: string): AIcorrectiveActionResponse {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const jsonText = fenceMatch ? fenceMatch[1] : trimmed;
  const start = jsonText.indexOf('{');
  const end = jsonText.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found in AI response.');
  const slice = jsonText.slice(start, end + 1);
  const parsed = JSON.parse(slice) as Partial<AIcorrectiveActionResponse>;

  return {
    problemStatement: parsed.problemStatement ?? '',
    containmentAction: parsed.containmentAction ?? '',
    rootCause: parsed.rootCause ?? '',
    correctiveAction: parsed.correctiveAction ?? '',
    preventiveAction: parsed.preventiveAction ?? '',
    standardReference: parsed.standardReference ?? '',
    verificationMethod: parsed.verificationMethod ?? '',
  };
}

export async function generateCorrectiveAction(
  ncr: NCR,
  profileStandard: string,
): Promise<AIcorrectiveActionResponse> {
  await ensureOnlineForAI();
  const proxyUrl = getProxyUrl();
  const userPrompt = buildUserPrompt(ncr, profileStandard);

  if (!proxyUrl) {
    if (__DEV__) {
      console.warn('[apiHelpers] No EXPO_PUBLIC_PROXY_URL configured.');
    }
    throw new Error(
      'AI corrective action service is not configured. Please contact your administrator.',
    );
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  let response: Response;
  try {
    response = await fetch(proxyUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      }),
    });
  } catch (err) {
    if (__DEV__) console.warn('[apiHelpers] Network error:', err);
    throw new Error('Unable to reach the AI service. Please check your connection and try again.');
  }

  if (!response.ok) {
    if (__DEV__) {
      const errText = await response.text().catch(() => '');
      console.warn('[apiHelpers] API error', response.status, errText);
    }
    throw new Error('The AI service returned an error. Please try again in a moment.');
  }

  let payload: AnthropicMessageResponse;
  try {
    payload = (await response.json()) as AnthropicMessageResponse;
  } catch (err) {
    if (__DEV__) console.warn('[apiHelpers] JSON parse error:', err);
    throw new Error('Received an unexpected response from the AI service.');
  }

  const text = payload.content?.find((b) => b.type === 'text')?.text ?? '';
  if (!text) throw new Error('The AI service returned no content.');

  try {
    return extractJSON(text);
  } catch (err) {
    if (__DEV__) console.warn('[apiHelpers] JSON extract error:', err, text);
    throw new Error('Could not parse the AI response. Please regenerate.');
  }
}

async function callAnthropicText(
  system: string,
  userContent: string,
  maxTokens: number,
): Promise<string> {
  await ensureOnlineForAI();
  const proxyUrl = getProxyUrl();
  if (!proxyUrl) {
    throw new Error('AI service is not configured.');
  }
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const response = await fetch(proxyUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userContent }],
    }),
  });
  if (!response.ok) throw new Error('AI service error.');
  const payload = (await response.json()) as AnthropicMessageResponse;
  const text = payload.content?.find((b) => b.type === 'text')?.text ?? '';
  if (!text) throw new Error('Empty AI response.');
  return text.trim();
}

// One Pager Builder: produce an executive summary from only the blocks
// the user selected. Falls back to a deterministic summary offline.
export async function generateExecutiveOnePager(
  ncr: NCR,
  profileStandard: string,
  blocks: string[],
): Promise<string> {
  const facts: string[] = [
    `NCR: ${ncr.ncrNumber} — ${ncr.title}`,
    `Severity: ${ncr.severity} · Status: ${ncr.status}`,
    `Standard in use: ${profileStandard || 'Not specified'}`,
  ];
  const ca = ncr.correctiveAction;
  if (blocks.includes('Problem Statement')) {
    facts.push(`Problem: ${ca?.problemStatement || ncr.description}`);
  }
  if (blocks.includes('Root Cause') && ca) facts.push(`Root Cause: ${ca.rootCause}`);
  if (blocks.includes('Corrective Action') && ca) {
    facts.push(`Corrective Action: ${ca.correctiveAction}`);
  }
  if (blocks.includes('Preventive Action') && ca) {
    facts.push(`Preventive Action: ${ca.preventiveAction}`);
  }
  if (blocks.includes('Standards Reference')) {
    facts.push(`Standard Reference: ${ca?.standardReference || ncr.standardRef}`);
  }
  if (blocks.includes('Timeline')) {
    facts.push(
      `Timeline: ${ncr.timeline.map((t) => t.label).join(' → ') || 'No events recorded'}`,
    );
  }
  if (blocks.includes('Actions')) {
    facts.push(
      `Actions: ${
        ncr.actions.map((a) => `${a.description} (${a.status})`).join('; ') || 'None'
      }`,
    );
  }
  if (blocks.includes('Assigned Parties')) {
    facts.push(`Assigned To: ${ncr.assignedTo || ca?.responsibleParty || 'Unassigned'}`);
  }
  if (blocks.includes('Photos')) {
    facts.push(`Photo evidence on file: ${ncr.photos.length}`);
  }

  const userContent =
    facts.join('\n') +
    '\n\nWrite a polished executive one-page summary covering only the information above. ' +
    'Use short paragraphs and clear headings. Audit-ready, factual, professional tone.';

  try {
    return await callAnthropicText(
      'You write concise, audit-ready executive one-page summaries of nonconformances for quality management leadership.',
      userContent,
      700,
    );
  } catch {
    return facts.join('\n\n');
  }
}

export async function generateOnePagerSummary(
  ncr: NCR,
  profileStandard: string,
): Promise<string> {
  await ensureOnlineForAI();
  const proxyUrl = getProxyUrl();
  if (!proxyUrl) {
    return [
      `${ncr.ncrNumber} — ${ncr.title}`,
      `Severity: ${ncr.severity}`,
      `Status: ${ncr.status}`,
      '',
      ncr.description,
      '',
      ncr.containmentAction ? `Containment: ${ncr.containmentAction}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  const response = await fetch(proxyUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 600,
      system:
        'You write concise executive one-page summaries of nonconformances for quality management leadership. Keep tone professional, factual, and audit-ready. Output as plain text with short paragraphs and bullet points where helpful.',
      messages: [
        {
          role: 'user',
          content: buildUserPrompt(ncr, profileStandard) + '\n\nReturn an executive one-page summary suitable for management review.',
        },
      ],
    }),
  });

  if (!response.ok) throw new Error('AI service error.');
  const payload = (await response.json()) as AnthropicMessageResponse;
  const text = payload.content?.find((b) => b.type === 'text')?.text ?? '';
  if (!text) throw new Error('Empty AI response.');
  return text.trim();
}

function sliceJSON(text: string): string {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const body = fence ? fence[1] : trimmed;
  const objStart = body.indexOf('{');
  const arrStart = body.indexOf('[');
  const start =
    objStart === -1 ? arrStart : arrStart === -1 ? objStart : Math.min(objStart, arrStart);
  const objEnd = body.lastIndexOf('}');
  const arrEnd = body.lastIndexOf(']');
  const end = Math.max(objEnd, arrEnd);
  if (start === -1 || end === -1) throw new Error('No JSON found in AI response.');
  return body.slice(start, end + 1);
}

export interface StandardSuggestion {
  recommendation: string;
  standards: string[];
}

// FIX 3 — recommend quality/safety standard clauses from an NCR's title +
// description. Free-tier feature, available to every user.
export async function suggestStandards(
  title: string,
  description: string,
  profileStandard: string,
): Promise<StandardSuggestion> {
  const userContent =
    `Quality framework in use: ${profileStandard || 'Not specified'}\n` +
    `NCR Title: ${title}\n` +
    `NCR Description: ${description}\n\n` +
    'Identify which quality/safety standard clause(s) this nonconformance most likely relates to ' +
    '(consider ISO 9001, IATF 16949, AS9100, OSHA). Respond ONLY with JSON of the form ' +
    '{"recommendation": "<one professional sentence explaining the most relevant reference>", ' +
    '"standards": ["ISO 9001 §8.7 — Control of Nonconforming Outputs", "..."]}. ' +
    'Return 1–4 entries in "standards", most relevant first.';

  const raw = await callAnthropicText(
    'You are a quality management expert in ISO 9001, IATF 16949, AS9100, and OSHA. You map nonconformances to the correct standard clauses. Return only valid JSON.',
    userContent,
    500,
  );
  try {
    const parsed = JSON.parse(sliceJSON(raw)) as Partial<StandardSuggestion>;
    const standards = Array.isArray(parsed.standards)
      ? parsed.standards.filter((s): s is string => typeof s === 'string' && s.length > 0)
      : [];
    return {
      recommendation:
        typeof parsed.recommendation === 'string' && parsed.recommendation.length > 0
          ? parsed.recommendation
          : 'Review the standards below and select any that apply.',
      standards,
    };
  } catch {
    throw new Error('Could not parse the AI suggestion. Please try again.');
  }
}

// Pattern detection — find recurring themes across the user's last 90d
// NCRs + audit fails. Returns 0–5 short pattern cards. Available to all tiers.
export interface DetectedPatternRaw {
  title: string;
  summary: string;
  count: number;
  relatedNcrIds: string[];
  suggestedAction: string;
  severity: 'Low' | 'Medium' | 'High';
}

export async function detectPatterns(input: {
  ncrSummaries: Array<{
    id: string;
    title: string;
    description: string;
    department: string;
    severity: string;
    createdAt: string;
    rootCause?: string;
  }>;
  auditFailures: Array<{
    auditName: string;
    layer: string;
    failedPrompt: string;
    createdAt: string;
  }>;
}): Promise<DetectedPatternRaw[]> {
  if (input.ncrSummaries.length < 3) return [];
  const userContent =
    'Look across the last 90 days of nonconformances and audit failures below. ' +
    'Identify up to 5 recurring patterns (same machine, area, process, or root cause theme). ' +
    'For each pattern return: title (<=60 chars), summary (1 sentence), count (number of related incidents), ' +
    'relatedNcrIds (array of NCR IDs from input), suggestedAction (1 sentence), severity (Low|Medium|High). ' +
    'Return ONLY JSON array, no prose.\n\n' +
    `NCRs:\n${JSON.stringify(input.ncrSummaries, null, 2)}\n\n` +
    `AuditFailures:\n${JSON.stringify(input.auditFailures, null, 2)}`;

  const raw = await callAnthropicText(
    'You are a quality manager spotting recurring patterns across nonconformances and audit failures. Return only valid JSON.',
    userContent,
    1500,
  );
  try {
    const parsed = JSON.parse(sliceJSON(raw)) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((p): DetectedPatternRaw | null => {
        const obj = p as Partial<DetectedPatternRaw>;
        if (!obj.title || !obj.summary) return null;
        return {
          title: String(obj.title).slice(0, 80),
          summary: String(obj.summary).slice(0, 240),
          count: typeof obj.count === 'number' ? obj.count : (obj.relatedNcrIds?.length ?? 1),
          relatedNcrIds: Array.isArray(obj.relatedNcrIds)
            ? obj.relatedNcrIds.filter((x): x is string => typeof x === 'string')
            : [],
          suggestedAction: String(obj.suggestedAction ?? '').slice(0, 240),
          severity:
            obj.severity === 'High' || obj.severity === 'Low' ? obj.severity : 'Medium',
        };
      })
      .filter((p): p is DetectedPatternRaw => p !== null)
      .slice(0, 5);
  } catch {
    return [];
  }
}

// NCR → Training: when corrective action root cause looks like a training
// gap, suggest a training plan to close the loop.
export interface TrainingSuggestion {
  topic: string;
  reason: string;
  suggestedEmployees: string[];
  materialTypes: string[]; // e.g. ["video", "document", "hands-on"]
}

export async function suggestTrainingFromNCR(
  ncrTitle: string,
  ncrDescription: string,
  rootCause: string,
  knownEmployees: string[],
): Promise<TrainingSuggestion> {
  const userContent =
    `NCR title: ${ncrTitle}\n` +
    `NCR description: ${ncrDescription}\n` +
    `Root cause: ${rootCause || 'Not specified'}\n` +
    `Known team members: ${knownEmployees.join(', ') || '(none provided)'}\n\n` +
    'Suggest a focused training intervention to prevent recurrence. Respond ONLY with JSON: ' +
    '{"topic": "...", "reason": "...", "suggestedEmployees": ["..."], "materialTypes": ["video", "document", "hands-on"]}. ' +
    'Choose suggestedEmployees from the known team members only (or empty array if none are clearly relevant).';

  const raw = await callAnthropicText(
    'You are a quality and training expert. You translate root cause findings into focused, actionable training plans. Return only valid JSON.',
    userContent,
    600,
  );
  try {
    const parsed = JSON.parse(sliceJSON(raw)) as Partial<TrainingSuggestion>;
    return {
      topic: parsed.topic ?? 'Targeted refresher training',
      reason: parsed.reason ?? 'Recurrence prevention',
      suggestedEmployees: Array.isArray(parsed.suggestedEmployees)
        ? parsed.suggestedEmployees.filter((x): x is string => typeof x === 'string')
        : [],
      materialTypes: Array.isArray(parsed.materialTypes)
        ? parsed.materialTypes.filter((x): x is string => typeof x === 'string')
        : ['document'],
    };
  } catch {
    throw new Error('Could not parse the AI suggestion. Please try again.');
  }
}

// Audit-to-NCR enrichment: ask the model for a clean title + severity hint
// for a single failed audit item, so users can edit polished defaults.
export interface AuditNCRDraft {
  title: string;
  suggestedSeverity: 'Low' | 'Medium' | 'High' | 'Critical';
  description: string;
  standardReference: string;
}

export async function enrichAuditFailureNCR(
  auditName: string,
  questionPrompt: string,
  auditorNote: string,
  weight: number,
  standard: string,
): Promise<AuditNCRDraft> {
  const userContent =
    `Audit: ${auditName}\n` +
    `Standard: ${standard}\n` +
    `Failed question: ${questionPrompt}\n` +
    `Auditor note: ${auditorNote || '(none)'}\n` +
    `Question weight: ${weight} (1-5; higher = more critical)\n\n` +
    'Produce a clean NCR draft. Respond ONLY with JSON: ' +
    '{"title": "<=70 chars", "suggestedSeverity": "Low|Medium|High|Critical", "description": "1-2 sentences", "standardReference": "<clause>"}.';

  const raw = await callAnthropicText(
    'You translate failed audit items into polished, audit-ready NCR drafts. Return only valid JSON.',
    userContent,
    600,
  );
  try {
    const parsed = JSON.parse(sliceJSON(raw)) as Partial<AuditNCRDraft>;
    const sev = parsed.suggestedSeverity;
    return {
      title: parsed.title ?? `LPA Finding — ${questionPrompt.slice(0, 60)}`,
      suggestedSeverity:
        sev === 'Low' || sev === 'High' || sev === 'Critical' ? sev : 'Medium',
      description: parsed.description ?? '',
      standardReference: parsed.standardReference ?? '',
    };
  } catch {
    return {
      title: `LPA Finding — ${questionPrompt.slice(0, 60)}`,
      suggestedSeverity: weight >= 4 ? 'High' : 'Medium',
      description: '',
      standardReference: '',
    };
  }
}

// AI quiz generation for training records. Returns 5 multiple-choice Qs.
export interface QuizQuestionDraft {
  prompt: string;
  options: string[];
  correctIndex: number;
}

export async function generateTrainingQuiz(
  topic: string,
  standardRef: string,
  notes: string,
): Promise<QuizQuestionDraft[]> {
  const userContent =
    `Training topic: ${topic}\n` +
    `Standard reference: ${standardRef || '(none)'}\n` +
    `Notes / context: ${notes || '(none)'}\n\n` +
    'Generate 5 multiple-choice verification questions. Each question has exactly 4 options and ' +
    'exactly one correct answer. Respond ONLY with a JSON array: ' +
    '[{"prompt": "...", "options": ["a","b","c","d"], "correctIndex": 0}, ...]';

  const raw = await callAnthropicText(
    'You are a quality trainer who writes precise comprehension-check questions. Return only valid JSON arrays.',
    userContent,
    1200,
  );
  try {
    const parsed = JSON.parse(sliceJSON(raw)) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((q): QuizQuestionDraft | null => {
        const obj = q as Partial<QuizQuestionDraft>;
        if (
          typeof obj.prompt !== 'string' ||
          !Array.isArray(obj.options) ||
          obj.options.length !== 4 ||
          typeof obj.correctIndex !== 'number' ||
          obj.correctIndex < 0 ||
          obj.correctIndex > 3
        ) {
          return null;
        }
        return {
          prompt: obj.prompt,
          options: obj.options.filter((o): o is string => typeof o === 'string'),
          correctIndex: obj.correctIndex,
        };
      })
      .filter((q): q is QuizQuestionDraft => q !== null && q.options.length === 4)
      .slice(0, 5);
  } catch {
    return [];
  }
}

// FIX 14 — generate a reusable audit checklist from a short scope
// description. Available to all tiers as a productivity feature.
export async function generateAuditTemplateQuestions(
  scope: string,
  layer: string,
  standard: string,
): Promise<string[]> {
  const userContent =
    `Audit scope: ${scope}\n` +
    `Audit layer: ${layer}\n` +
    `Standard: ${standard}\n\n` +
    'Generate 8–12 concise, specific audit checklist questions for a Layered Process Audit. ' +
    'Each question must be answerable with Pass / Fail / N-A. Respond ONLY with a JSON array of ' +
    'strings, e.g. ["Is the machine guard in place and undamaged?", "..."].';

  const raw = await callAnthropicText(
    'You are a manufacturing quality and safety auditor who writes precise Layered Process Audit checklists. Return only a valid JSON array of question strings.',
    userContent,
    900,
  );
  try {
    const parsed = JSON.parse(sliceJSON(raw)) as unknown;
    if (!Array.isArray(parsed)) throw new Error('not an array');
    return parsed
      .filter((q): q is string => typeof q === 'string')
      .map((q) => q.trim())
      .filter((q) => q.length > 0)
      .slice(0, 12);
  } catch {
    throw new Error('Could not parse the generated template. Please try again.');
  }
}
