import type { TranslationKey } from '@/i18n/translations';
import type { ApplicationStatus } from '@/types';

export type StepState = 'done' | 'current' | 'upcoming' | 'stopped';

export interface JourneyStep {
  key: TranslationKey;
  state: StepState;
}

const STEPS: TranslationKey[] = ['tlAudit', 'tlSubsidy', 'tlFinancing', 'tlVendor', 'tlInstall', 'tlActivation'];

/** Number of consumer-journey steps completed for each backend status. */
const COMPLETED_BY_STATUS: Record<ApplicationStatus, number> = {
  'Pending Verification': 3,
  Approved: 4,
  'Installation Scheduled': 4,
  Completed: 6,
  Rejected: 3,
};

export function getJourneySteps(status: ApplicationStatus): JourneyStep[] {
  const completed = COMPLETED_BY_STATUS[status];
  return STEPS.map((key, index) => {
    if (index < completed) return { key, state: 'done' };
    if (index === completed) return { key, state: status === 'Rejected' ? 'stopped' : 'current' };
    return { key, state: 'upcoming' };
  });
}
