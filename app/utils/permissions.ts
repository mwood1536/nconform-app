import { UserProfile, UserRole } from '../types';

// On mobile-only tiers (Free / Pro / Bundle), there is no shared workspace
// to enforce roles against, so every permission check resolves to true.
// When Pro Web ships, these helpers are the single seam where real
// enforcement gets wired in — call sites do not need to change.
//
// Role meanings (used by the locked Settings preview and Pro Web later):
// - admin    : full access — approve closures, change settings, manage users
// - standard : log NCRs, run audits, submit training; cannot approve / settings
// - viewer   : view open issues, submit safety observations only

export function roleOf(profile: UserProfile | null | undefined): UserRole {
  return profile?.permissionRole ?? 'admin';
}

export function isProWeb(profile: UserProfile | null | undefined): boolean {
  // Pro Web is sold direct, never via in-app upgrade — there is currently
  // no flag for it on mobile. Once it lands the check goes here.
  return false;
}

function effectiveRole(profile: UserProfile | null | undefined): UserRole {
  // Without Pro Web enforcement the user is effectively admin regardless
  // of stored role, so all permission helpers below treat them as admin.
  return isProWeb(profile) ? roleOf(profile) : 'admin';
}

export function canLogNCR(profile: UserProfile | null | undefined): boolean {
  const r = effectiveRole(profile);
  return r === 'admin' || r === 'standard';
}

export function canRunAudit(profile: UserProfile | null | undefined): boolean {
  const r = effectiveRole(profile);
  return r === 'admin' || r === 'standard';
}

export function canSubmitTraining(profile: UserProfile | null | undefined): boolean {
  const r = effectiveRole(profile);
  return r === 'admin' || r === 'standard';
}

export function canApproveClosure(profile: UserProfile | null | undefined): boolean {
  return effectiveRole(profile) === 'admin';
}

export function canManageUsers(profile: UserProfile | null | undefined): boolean {
  return effectiveRole(profile) === 'admin';
}

export function canChangeSettings(profile: UserProfile | null | undefined): boolean {
  return effectiveRole(profile) === 'admin';
}

export function canSubmitSafetyObservation(
  _profile: UserProfile | null | undefined,
): boolean {
  // Every tier can flag safety issues — that's the free viral hook.
  return true;
}

export function roleLabel(role: UserRole): string {
  switch (role) {
    case 'admin':
      return 'Admin / Full';
    case 'standard':
      return 'Standard / Partial';
    case 'viewer':
      return 'Viewer / Read';
  }
}

export function roleDescription(role: UserRole): string {
  switch (role) {
    case 'admin':
      return 'Can do everything — approve closures, change settings, manage users.';
    case 'standard':
      return 'Can log NCRs, run audits, submit training. Cannot approve closures or change settings.';
    case 'viewer':
      return 'Can view all open issues and submit safety observations only.';
  }
}

export const RoleOptions: UserRole[] = ['admin', 'standard', 'viewer'];
