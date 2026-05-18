export interface StandardLibraryEntry {
  code: string;
  fullName: string;
  description: string;
  keySections: { ref: string; title: string }[];
  whenToReference: string;
}

// Read-only educational reference. Available to all tiers.
export const StandardsLibrary: StandardLibraryEntry[] = [
  {
    code: 'ISO 9001',
    fullName: 'ISO 9001:2015 — Quality Management Systems',
    description:
      'The international baseline standard for quality management systems. Applies to any organization, in any sector, that wants to demonstrate consistent delivery of conforming products and services and continual improvement.',
    keySections: [
      { ref: '§8.7', title: 'Control of Nonconforming Outputs' },
      { ref: '§10.2', title: 'Nonconformity and Corrective Action' },
      { ref: '§9.1', title: 'Monitoring, Measurement, Analysis and Evaluation' },
      { ref: '§7.5', title: 'Documented Information' },
    ],
    whenToReference:
      'Reference for nearly all quality nonconformances when ISO 9001 is your certified standard. §8.7 governs how nonconforming product is identified and contained; §10.2 drives the corrective-action and root-cause process.',
  },
  {
    code: 'IATF 16949',
    fullName: 'IATF 16949:2016 — Automotive Quality Management',
    description:
      'The automotive sector standard built on ISO 9001, adding requirements specific to automotive production and relevant service parts. Required by most OEM supply chains.',
    keySections: [
      { ref: '§8.7.1', title: 'Control of Nonconforming Output' },
      { ref: '§10.2.3', title: 'Problem Solving' },
      { ref: '§10.2.4', title: 'Error-Proofing' },
      { ref: '§9.1.1.1', title: 'Manufacturing Process Monitoring' },
    ],
    whenToReference:
      'Use for nonconformances in automotive production. §10.2.3 expects a documented problem-solving method (e.g. 8D); §10.2.4 expects error-proofing be considered as part of corrective action.',
  },
  {
    code: 'AS9100',
    fullName: 'AS9100D — Aerospace Quality Management',
    description:
      'The aerospace, space and defense quality standard, based on ISO 9001 with added requirements for safety, configuration management, counterfeit-parts prevention, and product conformity.',
    keySections: [
      { ref: '§8.7', title: 'Control of Nonconforming Outputs' },
      { ref: '§10.2', title: 'Nonconformity and Corrective Action' },
      { ref: '§8.1.4', title: 'Prevention of Counterfeit Parts' },
      { ref: '§9.1', title: 'Monitoring, Measurement, Analysis and Evaluation' },
    ],
    whenToReference:
      'Reference for aerospace nonconformances. AS9100 requires nonconforming product be positively identified and segregated, and that corrective action address human factors and recurrence across similar processes.',
  },
  {
    code: 'OSHA',
    fullName: 'OSHA — U.S. Occupational Safety and Health Administration',
    description:
      'Federal workplace safety regulations (29 CFR). Applies to most U.S. employers. Referenced when a nonconformance has a safety dimension — guarding, lockout/tagout, PPE, hazardous energy, or recordable injury.',
    keySections: [
      { ref: '29 CFR 1904', title: 'Recording & Reporting Occupational Injuries' },
      { ref: '29 CFR 1910.147', title: 'The Control of Hazardous Energy (Lockout/Tagout)' },
      { ref: '29 CFR 1910.212', title: 'General Requirements for All Machines' },
      { ref: '29 CFR 1910.132', title: 'Personal Protective Equipment' },
    ],
    whenToReference:
      'Reference when a finding involves worker safety or a potential recordable incident. Pair the OSHA citation with your quality standard’s corrective-action clause so the fix addresses both compliance and safety.',
  },
];
