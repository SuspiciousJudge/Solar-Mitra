import type {
  Application,
  ApplicationStatus,
  Assignment,
  NewApplicationInput,
  NewAuditInput,
  NewTransactionInput,
  SolarAudit,
  TimelineEvent,
  Transaction,
  UserRecord,
  Vendor,
  VendorFilter,
} from '../types';
import type { ProviderApplication } from '../types/provider';

/**
 * Every controller talks to this interface. Two implementations exist:
 * - memoryStore: seeded in-memory data (DEMO_MODE=true, or MongoDB unreachable)
 * - mongoStore:  MongoDB via Mongoose (DEMO_MODE=false)
 */
export interface StatusUpdateCommand {
  id: string;
  status: ApplicationStatus;
  /** Audit-trail entry produced by `planStatusChange` (who/what/why/when). */
  event: TimelineEvent;
}

export interface DataStore {
  readonly mode: 'demo' | 'mongo';
  listVendors(filter?: VendorFilter): Promise<Vendor[]>;
  getVendor(id: string): Promise<Vendor | null>;
  setVendorActive(id: string, active: boolean): Promise<Vendor | null>;
  createAudit(input: NewAuditInput): Promise<SolarAudit>;
  getAudit(id: string): Promise<SolarAudit | null>;
  listAudits(): Promise<SolarAudit[]>;
  createApplication(input: NewApplicationInput): Promise<Application>;
  listApplications(): Promise<Application[]>;
  getApplication(id: string): Promise<Application | null>;
  updateApplicationStatus(command: StatusUpdateCommand): Promise<Application | null>;
  assignApplication(id: string, assignment: Assignment | null): Promise<Application | null>;
  /** Records an EMI payment against the application's repayment aggregate. */
  applyRepayment(id: string, dpd: number): Promise<Application | null>;
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserById(id: string): Promise<UserRecord | null>;
  listUsers(): Promise<UserRecord[]>;
  listTransactions(): Promise<Transaction[]>;
  createTransaction(input: NewTransactionInput): Promise<Transaction>;
  createUser(user: UserRecord): Promise<UserRecord>;
  updateUser(id: string, patch: Partial<Pick<UserRecord, 'name' | 'mobile' | 'providerId' | 'passwordHash'>>): Promise<UserRecord | null>;
  listProviderApplications(): Promise<ProviderApplication[]>;
  getProviderApplication(id: string): Promise<ProviderApplication | null>;
  getProviderApplicationByUserId(userId: string): Promise<ProviderApplication | null>;
  saveProviderApplication(application: ProviderApplication): Promise<ProviderApplication>;
  upsertVendor(vendor: Vendor): Promise<Vendor>;
  patchApplication(id: string, patch: Partial<Application>): Promise<Application | null>;
  reset(): Promise<void>;
}

export function filterVendors(vendors: Vendor[], filter: VendorFilter = {}): Vendor[] {
  const search = filter.search?.trim().toLowerCase();
  return vendors
    .filter((v) => {
      if (!filter.state) return true;
      const wanted = filter.state.toLowerCase();
      if (v.state.toLowerCase() === wanted) return true;
      return (v.serviceStates ?? []).some((state) => state.toLowerCase() === wanted);
    })
    .filter((v) => (filter.district ? (v.district ?? '').toLowerCase() === filter.district.toLowerCase() : true))
    .filter((v) => (filter.active === undefined ? true : v.active === filter.active))
    .filter((v) => (filter.verified === undefined ? true : v.verified === filter.verified))
    .filter((v) => (search ? `${v.name} ${v.location}`.toLowerCase().includes(search) : true))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

let activeStore: DataStore | null = null;

export function setStore(store: DataStore): void {
  activeStore = store;
}

export function getStore(): DataStore {
  if (!activeStore) throw new Error('Data store has not been initialised');
  return activeStore;
}
