/**
 * File ageing & SLA helpers — mirrored byte-for-byte at
 * `client/src/utils/ageing.ts` (checked by `server/tests/statusFlowSync.test.ts`).
 * Dependency-free so both packages can use it verbatim.
 */

/** Hours a file may sit in "Pending Verification" before the SLA badge turns red. */
export const SLA_HOURS = 48;

export interface AgeingView {
  /** Hours since the last timeline event (how long the file has been sitting). */
  waitingHours: number;
  /** "3d 4h" style label. */
  waitingLabel: string;
  /** True while the file is still waiting on the operator (pending verification). */
  slaBreached: boolean;
  slaHours: number;
}

export interface AgeingInput {
  status: string;
  createdAt: string;
  updatedAt?: string;
  /** Timestamp of the most recent timeline event, when available. */
  lastEventAt?: string;
}

const HOUR_MS = 3_600_000;

/** "3d 4h" · "5h 20m" · "48m" — never NaN. */
export function formatWaiting(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return 'just now';
  const totalMinutes = Math.floor(hours * 60);
  const days = Math.floor(totalMinutes / (60 * 24));
  const remainingHours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${remainingHours}h`;
  if (remainingHours > 0) return `${remainingHours}h ${minutes}m`;
  return `${Math.max(1, minutes)}m`;
}

function latestTimestamp(input: AgeingInput): number {
  const candidates = [input.lastEventAt, input.updatedAt, input.createdAt]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value));
  return candidates.length > 0 ? Math.max(...candidates) : Number.NaN;
}

/**
 * Waiting time = how long ago the file last moved. An SLA breach is a pending
 * verification older than `SLA_HOURS`.
 */
export function computeAgeing(input: AgeingInput, now: Date = new Date()): AgeingView {
  const last = latestTimestamp(input);
  const hours = Number.isFinite(last) ? Math.max(0, (now.getTime() - last) / HOUR_MS) : 0;
  return {
    waitingHours: Math.round(hours * 100) / 100,
    waitingLabel: formatWaiting(hours),
    slaBreached: input.status === 'Pending Verification' && hours > SLA_HOURS,
    slaHours: SLA_HOURS,
  };
}

/** Convenience for list views: the newest timeline entry wins. */
export function lastEventAt(timeline: { at: string }[] | undefined): string | undefined {
  if (!timeline || timeline.length === 0) return undefined;
  return timeline.reduce((latest, event) => (new Date(event.at).getTime() > new Date(latest).getTime() ? event.at : latest), timeline[0].at);
}
