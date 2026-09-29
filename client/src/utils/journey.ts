import type { TranslationKey } from '@/i18n/translations';
import type { ApplicationStatus } from '@/types';

export type StepState = 'done' | 'current' | 'upcoming' | 'stopped';

export interface JourneyStep {
  key: TranslationKey;
  state: StepState;
}

const STEPS: TranslationKey[] = ['tlAudit', 'tlSubsidy', 'tlFinancing', 'tlVendor', 'tlInstall', 'tlActivation'];

/** Consumer-journey steps completed per backend status (11-status machine). */
const COMPLETED_BY_STATUS: Record<ApplicationStatus, number> = {
  'Pending Verification': 3,
  Approved: 4,
  Rejected: 3,
  'Loan Sanctioned': 4,
  'Loan Disbursed': 4,
  'Installation Scheduled': 4,
  Installed: 4,
  'Net Meter Commissioned': 6,
  'Subsidy Claimed': 6,
  'Subsidy Credited': 6,
  Completed: 6,
};

export function getJourneySteps(status: ApplicationStatus): JourneyStep[] {
  const completed = COMPLETED_BY_STATUS[status] ?? 3;
  return STEPS.map((key, index) => {
    if (index < completed) return { key, state: 'done' };
    if (index === completed) return { key, state: status === 'Rejected' ? 'stopped' : 'current' };
    return { key, state: 'upcoming' };
  });
}
