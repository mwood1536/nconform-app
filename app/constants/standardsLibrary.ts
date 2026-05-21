export interface StandardLibraryEntry {
  code: string;
  fullName: string;
  version: string;
  description: string;
  appliesTo: string;
  keySections: { ref: string; title: string }[];
  commonFindings: string[];
  exampleScenarios: string[];
  whenToReference: string;
  externalLink: string;
}

// Read-only educational reference. Available to all tiers. Summaries are
// drafted in-app and intentionally compact — point users to the official
// published standards for authoritative requirements.
export const StandardsLibrary: StandardLibraryEntry[] = [
  {
    code: 'ISO 9001',
    fullName: 'ISO 9001 — Quality Management Systems',
    version: '2015',
    description:
      'The international baseline standard for quality management systems. Demonstrates consistent delivery of conforming products and services and a culture of continual improvement.',
    appliesTo:
      'Any organization, any sector, any size — most often companies seeking certification to win or keep customer contracts.',
    keySections: [
      { ref: '§8.7', title: 'Control of Nonconforming Outputs' },
      { ref: '§10.2', title: 'Nonconformity and Corrective Action' },
      { ref: '§9.1', title: 'Monitoring, Measurement, Analysis and Evaluation' },
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
      '§8.7 governs how nonconforming product is identified and contained; §10.2 drives the corrective-action and root-cause process. Reference for nearly all quality nonconformances when ISO 9001 is your certified standard.',
    externalLink: 'https://www.iso.org/standard/62085.html',
  },
  {
    code: 'IATF 16949',
    fullName: 'IATF 16949 — Automotive Quality Management',
    version: '2016',
    description:
      'The automotive sector standard built on ISO 9001, adding requirements specific to automotive production and relevant service parts. Required by most OEM supply chains.',
    appliesTo:
      'Automotive part manufacturers and service-part suppliers shipping to OEMs that mandate IATF certification.',
    keySections: [
      { ref: '§8.7.1', title: 'Control of Nonconforming Output' },
      { ref: '§10.2.3', title: 'Problem Solving' },
      { ref: '§10.2.4', title: 'Error-Proofing' },
      { ref: '§9.1.1.1', title: 'Manufacturing Process Monitoring' },
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
      'Use for nonconformances in automotive production. §10.2.3 expects a documented problem-solving method (e.g. 8D); §10.2.4 expects error-proofing be considered as part of corrective action.',
    externalLink: 'https://www.iatfglobaloversight.org/iatf-169492016/',
  },
  {
    code: 'AS9100',
    fullName: 'AS9100D — Aerospace Quality Management',
    version: 'Rev D (2016)',
    description:
      'The aerospace, space and defense quality standard, based on ISO 9001 with added requirements for safety, configuration management, counterfeit-parts prevention, and product conformity.',
    appliesTo:
      'Aerospace and defense manufacturers, MROs, and distributors supplying primes and government contractors.',
    keySections: [
      { ref: '§8.7', title: 'Control of Nonconforming Outputs' },
      { ref: '§10.2', title: 'Nonconformity and Corrective Action' },
      { ref: '§8.1.4', title: 'Prevention of Counterfeit Parts' },
      { ref: '§9.1', title: 'Monitoring, Measurement, Analysis and Evaluation' },
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
      'Reference for aerospace nonconformances. AS9100 requires nonconforming product be positively identified and segregated, and that corrective action address human factors and recurrence across similar processes.',
    externalLink: 'https://www.sae.org/standards/content/as9100d/',
  },
  {
    code: 'OSHA',
    fullName: 'OSHA — U.S. Occupational Safety and Health Administration',
    version: '29 CFR',
    description:
      'Federal workplace safety regulations. Applies to most U.S. employers. Referenced when a nonconformance has a safety dimension — guarding, lockout/tagout, PPE, hazardous energy, or recordable injury.',
    appliesTo: 'U.S. employers covered by the OSH Act — most private-sector workplaces.',
    keySections: [
      { ref: '29 CFR 1904', title: 'Recording & Reporting Occupational Injuries' },
      { ref: '29 CFR 1910.147', title: 'Control of Hazardous Energy (Lockout/Tagout)' },
      { ref: '29 CFR 1910.212', title: 'General Requirements for All Machines' },
      { ref: '29 CFR 1910.132', title: 'Personal Protective Equipment' },
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
      'Reference when a finding involves worker safety or a potential recordable incident. Pair the OSHA citation with your quality standard\'s corrective-action clause so the fix addresses both compliance and safety.',
    externalLink: 'https://www.osha.gov/laws-regs/regulations/standardnumber/1910',
  },
  {
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
