import type {
  Application,
  ApplicationStatus,
  NewApplicationInput,
  NewAuditInput,
  SolarAudit,
  UserRecord,
  Vendor,
  VendorFilter,
} from '../types';

/**
 * Every controller talks to this interface. Two implementations exist:
 * - memoryStore: seeded in-memory data (DEMO_MODE=true, or MongoDB unreachable)
 * - mongoStore:  MongoDB via Mongoose (DEMO_MODE=false)
 */
export interface DataStore {
  readonly mode: 'demo' | 'mongo';
  listVendors(filter?: VendorFilter): Promise<Vendor[]>;
  getVendor(id: string): Promise<Vendor | null>;
  setVendorActive(id: string, active: boolean): Promise<Vendor | null>;
  createAudit(input: NewAuditInput): Promise<SolarAudit>;
  getAudit(id: string): Promise<SolarAudit | null>;
  createApplication(input: NewApplicationInput): Promise<Application>;
  listApplications(): Promise<Application[]>;
  getApplication(id: string): Promise<Application | null>;
  updateApplicationStatus(id: string, status: ApplicationStatus, note?: string): Promise<Application | null>;
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserById(id: string): Promise<UserRecord | null>;
  reset(): Promise<void>;
}

export function filterVendors(vendors: Vendor[], filter: VendorFilter = {}): Vendor[] {
  const search = filter.search?.trim().toLowerCase();
  return vendors
    .filter((v) => (filter.state ? v.state.toLowerCase() === filter.state.toLowerCase() : true))
    .filter((v) => (filter.active === undefined ? true : v.active === filter.active))
    .filter((v) => (search ? `${v.name} ${v.location}`.toLowerCase().includes(search) : true))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export const STATUS_NOTES: Record<ApplicationStatus, string> = {
  'Pending Verification': 'Documents queued for verification',
  Approved: 'Loan approved by Satin Finserv credit team',
  Rejected: 'Application rejected after review',
  'Installation Scheduled': 'Vendor confirmed installation slot',
  Completed: 'System installed and net meter activated',
};

let activeStore: DataStore | null = null;

export function setStore(store: DataStore): void {
  activeStore = store;
}

export function getStore(): DataStore {
  if (!activeStore) throw new Error('Data store has not been initialised');
  return activeStore;
}
