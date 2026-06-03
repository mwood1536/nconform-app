// ---------------------------------------------------------------------------
// Shared Standards Library — single self-contained module behind an interface.
//
// This reconciles Root Cause AI's and NConform's previously-separate static
// standards copies into ONE canonical dataset, identical in both apps. The
// module shape and data are kept byte-identical across apps so it can later be
// (a) extracted into a shared package and (b) swapped for a server-backed
// source — without changing any call site (consumers use the accessors below).
//
// DEFERRED NEXT STEP: back getStandards()/searchStandards() with the Pro Web
// Supabase standards tables; keep this static data as the offline fallback.
// ---------------------------------------------------------------------------

export interface StandardClause {
  /** Clause / section reference, e.g. "§8.7" or "29 CFR 1904". */
  ref: string;
  title: string;
  /** Optional deep explanation (present for the most-referenced clauses). */
  detail?: string;
}

export interface StandardLibraryEntry {
  id: string;
  code: string;
  fullName: string;
  version: string;
  description: string;
  appliesTo: string;
  keySections: StandardClause[];
  commonFindings: string[];
  exampleScenarios: string[];
  whenToReference: string;
  externalLink: string;
}

export const StandardsLibrary: StandardLibraryEntry[] = [
  {
    id: 'iso9001',
    code: 'ISO 9001',
    fullName: 'ISO 9001 — Quality Management Systems',
    version: '2015',
    description:
      'The international baseline standard for quality management systems. Demonstrates consistent delivery of conforming products and services and a culture of continual improvement.',
    appliesTo:
      'Any organization, any sector, any size — most often companies seeking certification to win or keep customer contracts. It is the baseline most sector standards (IATF 16949, AS9100) build on.',
    keySections: [
      {
        ref: '§8.7',
        title: 'Control of Nonconforming Outputs',
        detail:
          'Requires that nonconforming product or service is identified and controlled to prevent unintended use or delivery. Take action appropriate to the nonconformity — correction, segregation, containment, return, or concession — and retain documented information describing the nonconformity, the action taken, and any concession obtained.',
      },
      {
        ref: '§10.2',
        title: 'Nonconformity and Corrective Action',
        detail:
          'When a nonconformity occurs (including from complaints) react to it, evaluate the need to eliminate its cause so it does not recur, determine root cause, implement corrective action, review effectiveness, and update risks/opportunities. This is the direct QMS hook for a root cause investigation.',
      },
      {
        ref: '§9.1',
        title: 'Monitoring, Measurement, Analysis and Evaluation',
        detail:
          'Defines the obligation to evaluate performance and QMS effectiveness using data. Investigation findings feed this clause as evidence of analysis.',
      },
      { ref: '§7.5', title: 'Documented Information' },
    ],
    commonFindings: [
      'Containment of nonconforming product not documented at point of detection.',
      'Corrective action lacks evidence of root cause analysis.',
      'Verification of effectiveness step missing or not closed.',
    ],
    exampleScenarios: [
      'Final inspection finds out-of-tolerance dimension; lot quarantined but no §8.7 disposition record on file.',
      'Repeat customer complaint with no §10.2 corrective action linking to prior CA.',
    ],
    whenToReference:
      'Reference §8.7 the moment nonconforming material is found and needs containment, and §10.2 when you open a formal investigation to drive root cause and corrective action. Use it as the default framework when no sector-specific standard applies.',
    externalLink: 'https://www.iso.org/standard/62085.html',
  },
  {
    id: 'iatf16949',
    code: 'IATF 16949',
    fullName: 'IATF 16949 — Automotive Quality Management',
    version: '2016',
    description:
      'The automotive sector standard built on ISO 9001, adding requirements specific to automotive production and relevant service parts. Required by most OEM supply chains.',
    appliesTo:
      'Automotive part manufacturers and service-part suppliers shipping to OEMs that mandate IATF certification. Customer-specific requirements (CSRs) apply on top of it.',
    keySections: [
      {
        ref: '§10.2.3',
        title: 'Problem Solving',
        detail:
          'Requires a documented problem-solving process: defined approaches for different problem types, containment, root cause analysis with a methodology, systemic corrective actions including review of similar processes/products, and verification of effectiveness. Customer-specified formats (e.g. 8D) must be used when required.',
      },
      {
        ref: '§10.2.4',
        title: 'Error-Proofing',
        detail:
          'The organization must use a documented process to determine and apply error-proofing (poka-yoke). Investigations frequently conclude with an error-proofing action under this clause.',
      },
      {
        ref: '§9.1.1.1',
        title: 'Manufacturing Process Monitoring and Measurement',
        detail:
          'Requires statistical studies and process capability monitoring; an investigation often references this clause when out-of-control conditions or capability loss triggered the nonconformance.',
      },
      {
        ref: '§8.7.1',
        title: 'Control of Nonconforming Output',
        detail:
          'Extends ISO 9001 §8.7 with automotive specifics: rework/repair confirmation, customer notification, and control of suspect product.',
      },
    ],
    commonFindings: [
      'Problem-solving record (e.g. 8D) lacks supplier-specific corrective action format.',
      'Error-proofing not evaluated as part of CA — no poka-yoke considered.',
      'Customer-specific requirements (CSRs) not mapped into the QMS.',
    ],
    exampleScenarios: [
      'Field return on a stamped bracket — 8D required by customer, not just internal CAR.',
      'SPC chart shows trend toward control limit but no §9.1.1.1 reaction plan invoked.',
    ],
    whenToReference:
      'Reference §10.2.3 for any automotive customer complaint or internal reject requiring a structured (often 8D) investigation, §8.7 for disposition of suspect or nonconforming product, and §10.2.4 when the corrective action is an error-proofing control.',
    externalLink: 'https://www.iatfglobaloversight.org/iatf-169492016/',
  },
  {
    id: 'as9100',
    code: 'AS9100',
    fullName: 'AS9100D — Aerospace Quality Management',
    version: 'Rev D (2016)',
    description:
      'The aerospace, space and defense quality standard, based on ISO 9001 with added requirements for safety, configuration management, counterfeit-parts prevention, and product conformity.',
    appliesTo:
      'Aerospace and defense manufacturers, MROs, and distributors supplying primes and government contractors.',
    keySections: [
      {
        ref: '§8.7',
        title: 'Control of Nonconforming Outputs',
        detail:
          'Adds aerospace rigor to ISO 9001 §8.7: nonconforming product must be positively identified and segregated; disposition (use-as-is or repair) requires authorization and, where required, customer approval; and counterfeit or suspect unapproved parts must be prevented from entering the supply chain.',
      },
      {
        ref: '§10.2',
        title: 'Nonconformity and Corrective Action',
        detail:
          'Requires determining root cause, evaluating whether the nonconformity exists elsewhere or could recur, flowing corrective action down to suppliers when responsible, and taking specific actions when timely/effective corrective action is not achieved.',
      },
      {
        ref: '§8.5.2',
        title: 'Identification and Traceability',
        detail:
          'Maintains traceability of product through realization. Investigations rely on this clause to scope affected lots/serial numbers and bound containment.',
      },
      { ref: '§8.1.4', title: 'Prevention of Counterfeit Parts' },
    ],
    commonFindings: [
      'Counterfeit part risk assessment missing for incoming electronics.',
      'Configuration baseline not updated with engineering change.',
      'Human factors not addressed in corrective action.',
    ],
    exampleScenarios: [
      'Suspect counterfeit IC found at incoming inspection — §8.1.4 traceability and quarantine path required.',
      'Final torque value out of spec on a fastener — corrective action must address human factors per AS9100.',
    ],
    whenToReference:
      'Reference §8.7 immediately for containment and segregation of nonconforming aerospace product (and counterfeit-part screening), §8.5.2 to define the affected population by lot/serial, and §10.2 to drive root cause, supplier flow-down, and escape analysis.',
    externalLink: 'https://www.sae.org/standards/content/as9100d/',
  },
  {
    id: 'osha',
    code: 'OSHA',
    fullName: 'OSHA — U.S. Occupational Safety and Health Administration',
    version: '29 CFR',
    description:
      'U.S. federal regulations governing workplace safety and health. Unlike the QMS standards, OSHA is law: mandatory requirements for hazard control, recordkeeping, and incident response. Safety incidents found during a quality investigation almost always carry an OSHA dimension.',
    appliesTo:
      'Virtually all private-sector U.S. employers (and many public-sector via state plans). Specific parts apply by industry — general industry, construction, maritime, agriculture.',
    keySections: [
      {
        ref: '29 CFR 1904',
        title: 'Recording & Reporting Occupational Injuries',
        detail:
          'Defines which work-related injuries/illnesses must be recorded on the OSHA 300 Log, recordability criteria, and reporting timeframes — fatalities within 8 hours; in-patient hospitalizations, amputations, and eye losses within 24 hours.',
      },
      {
        ref: '29 CFR 1910.147',
        title: 'Control of Hazardous Energy (Lockout/Tagout)',
        detail:
          'Requires energy-control procedures and training to protect workers during servicing and maintenance. Equipment-breakdown investigations involving servicing should verify LOTO compliance as a potential contributing cause.',
      },
      { ref: '29 CFR 1910.212', title: 'General Requirements for All Machines' },
      {
        ref: '5(a)(1)',
        title: 'General Duty Clause',
        detail:
          'Where no specific standard applies, employers must furnish a workplace free from recognized hazards likely to cause death or serious harm.',
      },
    ],
    commonFindings: [
      'LOTO procedure not posted at the machine.',
      'Recordable injury not entered in OSHA 300 log within required window.',
      'Machine guarding removed for cleaning, not reinstalled.',
    ],
    exampleScenarios: [
      'Operator finger injury on press — 1910.147 LOTO compliance must be evidenced as part of CA.',
      'Eye wash station inspection lapsed — log under safety NCR with 1910.132 reference.',
    ],
    whenToReference:
      'Reference 29 CFR 1904 the moment an investigation involves any injury or illness, to determine recordability and reporting deadlines. Reference the relevant 1910 standard when the root cause is a safety control failure, and fall back to the General Duty Clause when no specific standard fits.',
    externalLink: 'https://www.osha.gov/laws-regs/regulations/standardnumber/1910',
  },
  {
    id: 'iso14001',
    code: 'ISO 14001',
    fullName: 'ISO 14001 — Environmental Management Systems',
    version: '2015',
    description:
      'Framework for an effective environmental management system. Helps organizations identify environmental aspects, comply with legal obligations, and continually improve environmental performance.',
    appliesTo:
      'Organizations seeking to manage environmental responsibilities — emissions, waste, water, resource use — in a structured way.',
    keySections: [
      { ref: '§6.1.2', title: 'Environmental Aspects' },
      { ref: '§8.2', title: 'Emergency Preparedness and Response' },
      { ref: '§9.1.2', title: 'Evaluation of Compliance' },
      { ref: '§10.2', title: 'Nonconformity and Corrective Action' },
    ],
    commonFindings: [
      'Aspects and impacts register out of date.',
      'Spill response plan not tested annually.',
      'Permit limits exceeded without corrective action evidence.',
    ],
    exampleScenarios: [
      'Hydraulic oil spill in production — environmental NCR triggers §8.2 response and §10.2 root cause.',
      'Air-permit emission excursion — log under environmental NCR with §9.1.2 evaluation of compliance.',
    ],
    whenToReference:
      'Reference whenever the nonconformance has environmental impact: spills, emissions, waste handling, permit compliance, or resource use.',
    externalLink: 'https://www.iso.org/standard/60857.html',
  },
  {
    id: 'iso45001',
    code: 'ISO 45001',
    fullName: 'ISO 45001 — Occupational Health & Safety Management',
    version: '2018',
    description:
      'International OH&S management system standard. Provides a framework to prevent work-related injury and ill-health and to continually improve workplace safety.',
    appliesTo:
      'Any organization wanting a systematic, internationally recognized approach to workplace health and safety.',
    keySections: [
      { ref: '§6.1.2', title: 'Hazard Identification and Risk Assessment' },
      { ref: '§8.1.2', title: 'Eliminating Hazards / Reducing OH&S Risks' },
      { ref: '§8.2', title: 'Emergency Preparedness and Response' },
      { ref: '§10.2', title: 'Incident, Nonconformity and Corrective Action' },
    ],
    commonFindings: [
      'Worker consultation on hazard identification not documented.',
      'Hierarchy of controls not applied — PPE used where engineering control was feasible.',
      'Incident investigation lacks evidence of root cause analysis.',
    ],
    exampleScenarios: [
      'Near-miss on a manual handling task — §6.1.2 hazard ID + §8.1.2 control hierarchy revisit required.',
      'Fire alarm drill missed quarterly schedule — §8.2 emergency preparedness NCR.',
    ],
    whenToReference:
      'Reference for safety incidents and near-misses where the company is on an ISO 45001 path or wants a stronger management-system tie than OSHA alone provides.',
    externalLink: 'https://www.iso.org/standard/63787.html',
  },
  {
    id: 'fda21cfr820',
    code: 'FDA 21 CFR 820',
    fullName: 'FDA 21 CFR 820 — Quality System Regulation (Medical Devices)',
    version: 'Current',
    description:
      'U.S. FDA quality system regulation governing the design, manufacture, packaging, labeling, storage, installation, and servicing of finished medical devices.',
    appliesTo:
      'U.S. medical device manufacturers and importers. Increasingly harmonized with ISO 13485 expectations.',
    keySections: [
      { ref: '§820.90', title: 'Nonconforming Product' },
      { ref: '§820.100', title: 'Corrective and Preventive Action (CAPA)' },
      { ref: '§820.198', title: 'Complaint Files' },
      { ref: '§820.30', title: 'Design Controls' },
    ],
    commonFindings: [
      'CAPA records lack evidence of effectiveness verification.',
      'Complaint investigation not linked to CAPA when required.',
      'Nonconformance disposition not documented at the unit level.',
    ],
    exampleScenarios: [
      'Field complaint on infusion-pump alarm — §820.198 file plus §820.100 CAPA decision required.',
      'Lot-acceptance failure on a sterile barrier — §820.90 disposition and trend review.',
    ],
    whenToReference:
      'Reference for any medical-device quality event: complaints, MDRs, CAPAs, design-output deviations, and process validation excursions.',
    externalLink:
      'https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfcfr/CFRSearch.cfm?CFRPart=820',
  },
];

// ---- Accessors (the stable API consumers use) -----------------------------

export function getStandards(): StandardLibraryEntry[] {
  return StandardsLibrary;
}

export function getStandard(id: string): StandardLibraryEntry | undefined {
  return StandardsLibrary.find((s) => s.id === id || s.code === id);
}

/** Wiki-style search across code, name, description, clauses, and findings. */
export function searchStandards(query: string): StandardLibraryEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return StandardsLibrary;
  return StandardsLibrary.filter((s) => {
    const haystack = [
      s.code,
      s.fullName,
      s.description,
      s.appliesTo,
      s.whenToReference,
      ...s.keySections.flatMap((k) => [k.ref, k.title, k.detail ?? '']),
      ...s.commonFindings,
      ...s.exampleScenarios,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

/** Compact references for embedding in reports / one-pagers. */
export function standardClauseRefs(id: string): string[] {
  const s = getStandard(id);
  if (!s) return [];
  return s.keySections.map((k) => `${s.code} ${k.ref} — ${k.title}`);
}
