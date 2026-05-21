import { Storage } from './storage';

export const DefaultDepartments: string[] = [
  'Production',
  'Quality',
  'Maintenance',
  'Warehouse',
  'Shipping',
  'Receiving',
  'Other',
];

export async function allDepartments(): Promise<string[]> {
  const custom = await Storage.getCustomDepartments();
  // Defaults first, then de-duped custom additions.
  const seen = new Set(DefaultDepartments.map((d) => d.toLowerCase()));
  const extras = custom.filter((c) => !seen.has(c.toLowerCase()));
  return [...DefaultDepartments, ...extras];
}
