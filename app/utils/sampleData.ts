import {
  Audit,
  AuditQuestion,
  AuditTemplate,
  NCR,
  SafetyObservation,
  TrainingRecord,
} from '../types';
import { generateId, nowISO } from './ncrHelpers';
import { Storage } from './storage';

function isoDaysAgo(days: number): string {
  const d = new Date(Date.now() - days * 24 * 3600_000);
  return d.toISOString();
}

function makeQuestion(prompt: string, weight = 1, requiresPhoto = false): AuditQuestion {
  return {
    id: generateId('q'),
    prompt,
    requiresPhoto,
    weight,
    followUpOnFail: null,
  };
}

function sampleNCRs(): NCR[] {
  const departments = ['Production', 'Quality', 'Maintenance', 'Warehouse', 'Shipping'];
  const titles = [
    'Burr on machined edge — Op 20',
    'Missing torque mark on assembly',
    'Cardboard packaging crushed in transit',
    'Calibration sticker missing on pin gauge',
    'Operator skipped final inspection',
    'Foreign object in finished product',
    'Wrong label revision applied',
    'Forklift damage on raw material',
    'Lock-out tag not used on hydraulic press',
    'Wrong material grade pulled from stock',
  ];
  return titles.map((title, i) => {
    const created = isoDaysAgo(60 - i * 5);
    const closed = i % 3 === 0;
    const ts = created;
    return {
      id: generateId('ncr'),
      ncrNumber: `NCR-${String(900 + i).padStart(3, '0')}`,
      title,
      detectionPoint: (['In-Process', 'Final Inspection', 'Internal Audit'] as const)[i % 3],
      severity: (['Low', 'Medium', 'High', 'Critical'] as const)[i % 4],
      standardRef: (['ISO 9001 Clause', 'IATF Requirement', 'AS9100 Clause', 'N/A'] as const)[i % 4],
      description:
        'Sample NCR auto-generated for demo. Use this to explore how investigations, corrective actions, and approval workflows look once your team is using the app.',
      standardClauses: i % 2 === 0 ? ['ISO 9001 §8.7'] : [],
      photos: [],
      containmentAction: i % 2 === 0 ? 'Segregated affected lot for inspection.' : '',
      assignedTo: ['Sam Carter', 'Priya Patel', 'Diego Rivera'][i % 3],
      dueDate: isoDaysAgo(-7 + i),
      status: closed ? 'Closed' : i % 4 === 1 ? 'In Progress' : 'Open',
      department: departments[i % departments.length],
      createdAt: created,
      updatedAt: ts,
      sharedWithRCA: false,
      correctiveAction: null,
      actions: [],
      timeline: [
        {
          id: generateId('tl'),
          label: 'NCR Created',
          detail: 'Demo data',
          timestamp: ts,
        },
      ],
      parentAuditId: null,
      generatedTrainingIds: [],
      approvalWorkflow: {
        status: closed ? 'Closed' : i % 4 === 1 ? 'Under Review' : 'Draft',
        history: [],
        comments: [],
      },
      isSampleData: true,
    };
  });
}

function sampleAuditTemplates(): AuditTemplate[] {
  return [
    {
      id: generateId('tpl'),
      name: 'Demo: Daily 5S Walkthrough',
      layer: 'Layer 1 — Operator',
      standard: 'ISO 9001',
      mode: 'fixed',
      questions: [
        makeQuestion('Are all work surfaces clean and orderly?'),
        makeQuestion('Is PPE worn correctly by all operators?', 3),
        makeQuestion('Are tools returned to designated locations?'),
        makeQuestion('Is the floor free of slip/trip hazards?', 2),
      ],
      questionBank: [],
      sampleSize: 10,
      recurrence: null,
      createdAt: nowISO(),
    },
    {
      id: generateId('tpl'),
      name: 'Demo: Supervisor Process Audit',
      layer: 'Layer 2 — Supervisor',
      standard: 'IATF 16949',
      mode: 'fixed',
      questions: [
        makeQuestion('Is the control plan revision current?', 4),
        makeQuestion('Are first-piece inspections documented this shift?'),
        makeQuestion('Are SPC charts being maintained per requirement?'),
      ],
      questionBank: [],
      sampleSize: 10,
      recurrence: null,
      createdAt: nowISO(),
    },
    {
      id: generateId('tpl'),
      name: 'Demo: Safety Walk (Random)',
      layer: 'Layer 1 — Operator',
      standard: 'OSHA',
      mode: 'random',
      questions: [],
      questionBank: [
        makeQuestion('Is the emergency stop accessible and tested?', 3),
        makeQuestion('Are fire extinguishers inspected and in date?'),
        makeQuestion('Are eyewash stations functional?', 2),
        makeQuestion('Are aisles clear and marked?'),
        makeQuestion('Is electrical panel access unobstructed?', 2),
        makeQuestion('Is the spill kit fully stocked?'),
      ],
      sampleSize: 4,
      recurrence: null,
      createdAt: nowISO(),
    },
  ];
}

function sampleAudits(): Audit[] {
  return [
    {
      id: generateId('aud'),
      templateId: null,
      name: 'Demo: Line 3 LPA — Week 22',
      layer: 'Layer 1 — Operator',
      standard: 'ISO 9001',
      department: 'Production',
      questions: [
        makeQuestion('Are work surfaces clean and orderly?'),
        makeQuestion('Is PPE worn correctly?', 3),
        makeQuestion('Are tools returned to designated locations?'),
      ],
      responses: [],
      passRate: 67,
      weightedPassRate: 60,
      randomizationSeed: null,
      parentAuditId: null,
      layerLevel: 1,
      status: 'Completed',
      assignedTo: 'Sam Carter',
      generatedNcrIds: [],
      createdAt: isoDaysAgo(7),
      completedAt: isoDaysAgo(7),
      isSampleData: true,
    },
    {
      id: generateId('aud'),
      templateId: null,
      name: 'Demo: Supervisor Process Audit',
      layer: 'Layer 2 — Supervisor',
      standard: 'IATF 16949',
      department: 'Quality',
      questions: [
        makeQuestion('Is the control plan revision current?', 4),
        makeQuestion('Are first-piece inspections documented?'),
      ],
      responses: [],
      passRate: 100,
      weightedPassRate: 100,
      randomizationSeed: null,
      parentAuditId: null,
      layerLevel: 2,
      status: 'Completed',
      assignedTo: 'Priya Patel',
      generatedNcrIds: [],
      createdAt: isoDaysAgo(14),
      completedAt: isoDaysAgo(14),
      isSampleData: true,
    },
  ].map((a) => ({
    ...a,
    responses: a.questions.map((q) => ({
      questionId: q.id,
      result: a.passRate >= 80 ? 'Pass' : Math.random() > 0.5 ? 'Pass' : 'Fail',
      note: '',
      photo: null,
      followUpAnswer: '',
      followUpPhoto: null,
    })),
  })) as Audit[];
}

function sampleTraining(): TrainingRecord[] {
  return [
    {
      id: generateId('trn'),
      employeeName: 'Sam Carter',
      topic: 'Demo: Forklift Refresher',
      standardRef: 'OSHA 1910.178',
      trainerName: 'Diego Rivera',
      dateCompleted: isoDaysAgo(10),
      notes: 'Demo data',
      photo: null,
      signOffStatement: 'Confirmed sign-off (demo).',
      signedAt: isoDaysAgo(10),
      status: 'Complete',
      materials: [],
      certificationExpiresOn: isoDaysAgo(-365),
      recurrence: null,
      parentRecordId: null,
      parentNcrId: null,
      templateId: null,
      quiz: null,
      createdAt: isoDaysAgo(10),
      isSampleData: true,
    },
    {
      id: generateId('trn'),
      employeeName: 'Priya Patel',
      topic: 'Demo: Control Plan Awareness',
      standardRef: 'ISO 9001 §7.2',
      trainerName: 'Sam Carter',
      dateCompleted: isoDaysAgo(3),
      notes: 'Demo data',
      photo: null,
      signOffStatement: null,
      signedAt: null,
      status: 'Pending',
      materials: [],
      certificationExpiresOn: null,
      recurrence: null,
      parentRecordId: null,
      parentNcrId: null,
      templateId: null,
      quiz: null,
      createdAt: isoDaysAgo(3),
      isSampleData: true,
    },
    {
      id: generateId('trn'),
      employeeName: 'Diego Rivera',
      topic: 'Demo: Hazard Communication',
      standardRef: 'OSHA 1910.1200',
      trainerName: 'Sam Carter',
      dateCompleted: isoDaysAgo(40),
      notes: 'Demo data',
      photo: null,
      signOffStatement: null,
      signedAt: null,
      status: 'Overdue',
      materials: [],
      certificationExpiresOn: isoDaysAgo(-20),
      recurrence: null,
      parentRecordId: null,
      parentNcrId: null,
      templateId: null,
      quiz: null,
      createdAt: isoDaysAgo(40),
      isSampleData: true,
    },
    {
      id: generateId('trn'),
      employeeName: 'Sam Carter',
      topic: 'Demo: LOTO Refresher',
      standardRef: 'OSHA 1910.147',
      trainerName: 'External Vendor',
      dateCompleted: isoDaysAgo(2),
      notes: 'Demo data',
      photo: null,
      signOffStatement: 'Confirmed sign-off (demo).',
      signedAt: isoDaysAgo(2),
      status: 'Complete',
      materials: [],
      certificationExpiresOn: isoDaysAgo(-30),
      recurrence: null,
      parentRecordId: null,
      parentNcrId: null,
      templateId: null,
      quiz: null,
      createdAt: isoDaysAgo(2),
      isSampleData: true,
    },
    {
      id: generateId('trn'),
      employeeName: 'Priya Patel',
      topic: 'Demo: Welding Safety',
      standardRef: 'OSHA 1910.252',
      trainerName: 'Sam Carter',
      dateCompleted: isoDaysAgo(20),
      notes: 'Demo data',
      photo: null,
      signOffStatement: 'Confirmed sign-off (demo).',
      signedAt: isoDaysAgo(20),
      status: 'Complete',
      materials: [],
      certificationExpiresOn: isoDaysAgo(-60),
      recurrence: null,
      parentRecordId: null,
      parentNcrId: null,
      templateId: null,
      quiz: null,
      createdAt: isoDaysAgo(20),
      isSampleData: true,
    },
  ];
}

function sampleObservations(): SafetyObservation[] {
  return [
    {
      id: generateId('obs'),
      description:
        'Demo: noticed a wet patch near the press line — placed cone but should investigate source.',
      photo: null,
      location: 'Line 3, north aisle',
      createdAt: isoDaysAgo(2),
      syncedToTeam: false,
      destinationTeamId: null,
      isSampleData: true,
    },
    {
      id: generateId('obs'),
      description: 'Demo: forklift speed in warehouse seems excessive near loading dock.',
      photo: null,
      location: 'Warehouse, Dock 4',
      createdAt: isoDaysAgo(5),
      syncedToTeam: false,
      destinationTeamId: null,
      isSampleData: true,
    },
  ];
}

export async function loadSampleData(): Promise<void> {
  const [existingNcrs, existingTemplates, existingAudits, existingTraining, existingObs] =
    await Promise.all([
      Storage.getNCRs(),
      Storage.getAuditTemplates(),
      Storage.getAudits(),
      Storage.getTrainingRecords(),
      Storage.getSafetyObservations(),
    ]);
  const ncrs = sampleNCRs();
  const templates = sampleAuditTemplates();
  const audits = sampleAudits();
  const training = sampleTraining();
  const observations = sampleObservations();
  await Storage.setNCRs([...ncrs, ...existingNcrs]);
  await Storage.setAuditTemplates([...templates, ...existingTemplates]);
  await Storage.setAudits([...audits, ...existingAudits]);
  await Storage.setTrainingRecords([...training, ...existingTraining]);
  await Storage.setSafetyObservations([...observations, ...existingObs]);
  await Storage.setDemoDataLoaded(true);
}

export async function removeSampleData(): Promise<void> {
  const [ncrs, templates, audits, training, observations] = await Promise.all([
    Storage.getNCRs(),
    Storage.getAuditTemplates(),
    Storage.getAudits(),
    Storage.getTrainingRecords(),
    Storage.getSafetyObservations(),
  ]);
  await Storage.setNCRs(ncrs.filter((n) => !n.isSampleData));
  // Templates don't carry isSampleData (older type); identify by demo prefix.
  await Storage.setAuditTemplates(templates.filter((t) => !t.name.startsWith('Demo:')));
  await Storage.setAudits(audits.filter((a) => !a.isSampleData));
  await Storage.setTrainingRecords(training.filter((r) => !r.isSampleData));
  await Storage.setSafetyObservations(observations.filter((o) => !o.isSampleData));
  await Storage.setDemoDataLoaded(false);
}
