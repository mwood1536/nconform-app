import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { NCR, TrainingRecord } from '../types';
import { formatDate } from './ncrHelpers';

function escapeHTML(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const baseStyles = `
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1A1A2E; padding: 32px; }
  h1 { color: #1B2A4A; font-size: 24px; margin-bottom: 4px; }
  h2 { color: #1B2A4A; font-size: 16px; margin-top: 24px; margin-bottom: 8px; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px; }
  .meta { color: #6B7280; font-size: 11px; margin-bottom: 24px; letter-spacing: 1px; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #E2E8F0; font-size: 12px; }
  th { background: #F8F9FB; color: #1B2A4A; font-size: 11px; letter-spacing: .5px; text-transform: uppercase; }
  .pill { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; letter-spacing: .4px; text-transform: uppercase; }
  .sev-Low { background: #6B72801A; color: #6B7280; }
  .sev-Medium { background: #D4A0171A; color: #D4A017; }
  .sev-High { background: #D4821A1A; color: #D4821A; }
  .sev-Critical { background: #C0392B1A; color: #C0392B; }
  .footer { margin-top: 36px; font-size: 10px; color: #6B7280; letter-spacing: 1.4px; text-transform: uppercase; }
`;

interface ReportFilters {
  status?: 'All' | 'Open' | 'In Progress' | 'Closed';
  severity?: 'All' | 'Low' | 'Medium' | 'High' | 'Critical';
  start?: string;
  end?: string;
}

export function buildNCRSummaryHTML(ncrs: NCR[], filters: ReportFilters): string {
  const filtered = ncrs.filter((n) => {
    if (filters.status && filters.status !== 'All' && n.status !== filters.status) return false;
    if (filters.severity && filters.severity !== 'All' && n.severity !== filters.severity) return false;
    if (filters.start && new Date(n.createdAt) < new Date(filters.start)) return false;
    if (filters.end && new Date(n.createdAt) > new Date(filters.end)) return false;
    return true;
  });

  const rows = filtered
    .map(
      (n) => `
      <tr>
        <td><strong>${escapeHTML(n.ncrNumber)}</strong></td>
        <td>${escapeHTML(n.title)}</td>
        <td><span class="pill sev-${escapeHTML(n.severity)}">${escapeHTML(n.severity)}</span></td>
        <td>${escapeHTML(n.status)}</td>
        <td>${escapeHTML(n.detectionPoint)}</td>
        <td>${escapeHTML(formatDate(n.createdAt))}</td>
      </tr>`,
    )
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8" /><style>${baseStyles}</style></head>
  <body>
    <div class="meta">NConform · NCR Summary Report</div>
    <h1>Nonconformance Summary</h1>
    <div style="color:#6B7280;font-size:12px;">${filtered.length} record${filtered.length === 1 ? '' : 's'}${
      filters.start && filters.end ? ` · ${formatDate(filters.start)}–${formatDate(filters.end)}` : ''
    }</div>
    <table>
      <thead>
        <tr><th>NCR</th><th>Title</th><th>Severity</th><th>Status</th><th>Detection</th><th>Created</th></tr>
      </thead>
      <tbody>${rows || '<tr><td colspan="6" style="text-align:center;color:#6B7280;">No records match these filters.</td></tr>'}</tbody>
    </table>
    <div class="footer">IRONSTRATOS LLC · Generated ${escapeHTML(new Date().toLocaleString())}</div>
  </body></html>`;
}

export function buildCorrectiveActionHTML(ncrs: NCR[]): string {
  const withCA = ncrs.filter((n) => n.correctiveAction);
  const rows = withCA
    .map((n) => {
      const ca = n.correctiveAction!;
      const overdue =
        ca.targetDate && new Date(ca.targetDate).getTime() < Date.now() && ca.status !== 'Verified';
      return `
      <tr>
        <td><strong>${escapeHTML(n.ncrNumber)}</strong></td>
        <td>${escapeHTML(n.title)}</td>
        <td>${escapeHTML(ca.standardReference || '—')}</td>
        <td>${escapeHTML(ca.responsibleParty || '—')}</td>
        <td>${escapeHTML(ca.targetDate ? formatDate(ca.targetDate) : '—')}</td>
        <td style="color:${overdue ? '#C0392B' : '#1A1A2E'}; font-weight:${overdue ? 700 : 400};">
          ${overdue ? 'Overdue' : escapeHTML(ca.status)}
        </td>
      </tr>`;
    })
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8" /><style>${baseStyles}</style></head>
  <body>
    <div class="meta">NConform · Corrective Action Status</div>
    <h1>Corrective Action Status</h1>
    <div style="color:#6B7280;font-size:12px;">${withCA.length} corrective action${withCA.length === 1 ? '' : 's'}</div>
    <table>
      <thead>
        <tr><th>NCR</th><th>Title</th><th>Standard</th><th>Owner</th><th>Target</th><th>Status</th></tr>
      </thead>
      <tbody>${rows || '<tr><td colspan="6" style="text-align:center;color:#6B7280;">No corrective actions yet.</td></tr>'}</tbody>
    </table>
    <div class="footer">IRONSTRATOS LLC · Generated ${escapeHTML(new Date().toLocaleString())}</div>
  </body></html>`;
}

export function buildTrainingHTML(records: TrainingRecord[]): string {
  const rows = records
    .map(
      (r) => `
      <tr>
        <td><strong>${escapeHTML(r.employeeName)}</strong></td>
        <td>${escapeHTML(r.topic)}</td>
        <td>${escapeHTML(r.standardRef || '—')}</td>
        <td>${escapeHTML(r.trainerName || '—')}</td>
        <td>${escapeHTML(r.dateCompleted ? formatDate(r.dateCompleted) : '—')}</td>
        <td>${escapeHTML(r.status)}</td>
        <td>${escapeHTML(r.signedAt ? `Signed ${formatDate(r.signedAt)}` : 'Not signed')}</td>
      </tr>`,
    )
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8" /><style>${baseStyles}</style></head>
  <body>
    <div class="meta">NConform · Training Sign-Off Register</div>
    <h1>Training Sign-Off Register</h1>
    <div style="color:#6B7280;font-size:12px;">${records.length} record${
      records.length === 1 ? '' : 's'
    }</div>
    <table>
      <thead>
        <tr><th>Employee</th><th>Topic</th><th>Reference</th><th>Trainer</th><th>Completed</th><th>Status</th><th>Sign-Off</th></tr>
      </thead>
      <tbody>${rows || '<tr><td colspan="7" style="text-align:center;color:#6B7280;">No training records.</td></tr>'}</tbody>
    </table>
    <div class="footer">IRONSTRATOS LLC · SMITHS STATION, ALABAMA · Generated ${escapeHTML(
      new Date().toLocaleString(),
    )}</div>
  </body></html>`;
}

export async function generateAndSharePDF(html: string, fileName: string): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: fileName,
    });
  }
}
