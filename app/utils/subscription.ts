import { Colors } from '../constants/colors';
import { SubscriptionTier, UserProfile } from '../types';

// Pricing is locked as of May 17 2026. There is no Team tier — Bundle
// replaced it. Professional Web ($12K/yr) and Enterprise ($36K/yr) are
// sold direct via ironstratos.com and are intentionally absent here.
export const Pricing = {
  pro: {
    price: '$4.99',
    cadence: 'one-time',
    cta: 'Upgrade to Pro — $4.99',
    blurb: 'Removes ads. One-time purchase. Solo use, local storage only.',
  },
  bundle: {
    price: '$19.99',
    cadence: 'per user / month, billed annually',
    cta: 'Upgrade to Bundle — $19.99/user/month',
    blurb:
      'Root Cause AI + NConform, no ads, cloud multi-user sync, shared NCRs, actions, and team directory.',
  },
} as const;

export const EnterpriseURL = 'https://ironstratos.com';
export const PrivacyURL = 'https://ironstratos.com/nconform/privacy';
export const TermsURL = 'https://ironstratos.com/nconform/terms';

export function tierLabel(tier: SubscriptionTier): string {
  switch (tier) {
    case 'pro':
      return 'Pro';
    case 'bundle':
      return 'Bundle';
    default:
      return 'Free';
  }
}

export function tierColor(tier: SubscriptionTier): string {
  switch (tier) {
    case 'pro':
      return Colors.amber;
    case 'bundle':
      return Colors.steelBlue;
    default:
      return Colors.secondaryText;
  }
}

function tierOf(profile: UserProfile | null | undefined): SubscriptionTier {
  return profile?.subscriptionTier ?? 'free';
}

// Pro unlocks ad-free + One Pager. Bundle is a superset of Pro.
export function isProOrBundle(profile: UserProfile | null | undefined): boolean {
  const t = tierOf(profile);
  return t === 'pro' || t === 'bundle';
}

// Bundle-only: Audits, Training, shared user directory, cloud sync.
export function isBundle(profile: UserProfile | null | undefined): boolean {
  return tierOf(profile) === 'bundle';
}

export function adsEnabled(profile: UserProfile | null | undefined): boolean {
  return tierOf(profile) === 'free';
}
