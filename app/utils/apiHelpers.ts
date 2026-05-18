import { AIcorrectiveActionResponse, NCR } from '../types';

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

function getProxyUrl(): string | null {
  const url = process.env.EXPO_PUBLIC_PROXY_URL;
  return url && url.length > 0 ? url : null;
}

function getDirectKey(): string | null {
  const key = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  return key && key.length > 0 ? key : null;
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
  const proxyUrl = getProxyUrl();
  const directKey = getDirectKey();
  const userPrompt = buildUserPrompt(ncr, profileStandard);

  if (!proxyUrl && !directKey) {
    if (__DEV__) {
      console.warn('[apiHelpers] No EXPO_PUBLIC_PROXY_URL or EXPO_PUBLIC_ANTHROPIC_API_KEY configured.');
    }
    throw new Error(
      'AI corrective action service is not configured. Please contact your administrator.',
    );
  }

  const endpoint = proxyUrl ?? 'https://api.anthropic.com/v1/messages';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (!proxyUrl && directKey) {
    headers['x-api-key'] = directKey;
    headers['anthropic-version'] = '2023-06-01';
  }

  let response: Response;
  try {
    response = await fetch(endpoint, {
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
  const proxyUrl = getProxyUrl();
  const directKey = getDirectKey();
  if (!proxyUrl && !directKey) {
    throw new Error('AI service is not configured.');
  }
  const endpoint = proxyUrl ?? 'https://api.anthropic.com/v1/messages';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (!proxyUrl && directKey) {
    headers['x-api-key'] = directKey;
    headers['anthropic-version'] = '2023-06-01';
  }
  const response = await fetch(endpoint, {
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
  const proxyUrl = getProxyUrl();
  const directKey = getDirectKey();
  if (!proxyUrl && !directKey) {
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

  const endpoint = proxyUrl ?? 'https://api.anthropic.com/v1/messages';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (!proxyUrl && directKey) {
    headers['x-api-key'] = directKey;
    headers['anthropic-version'] = '2023-06-01';
  }

  const response = await fetch(endpoint, {
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
