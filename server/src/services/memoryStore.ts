import bcrypt from 'bcryptjs';
import { env } from '../config/env';
import { SEED_USERS } from '../data/historicalSeed';
import { createFullSeed } from '../data/mockDatabase';
import { createProviderSeed, toProviderUserRecords } from '../data/providerSeed';
import { TRANSACTION_DIRECTIONS, type Application, type SolarAudit, type Transaction, type UserRecord, type Vendor } from '../types';
import type { ProviderApplication } from '../types/provider';
import { generateApplicationId, generateAuditId, generateTransactionId } from '../utils/ids';
import { filterVendors, type DataStore } from './dataStore';
import { resetDocumentDir } from './documentStore';

interface MemoryState {
  vendors: Vendor[];
  applications: Application[];
  audits: SolarAudit[];
  transactions: Transaction[];
  users: UserRecord[];
  providerApplications: ProviderApplication[];
}

/** Seeded operator accounts — the admin entry honours ADMIN_EMAIL/ADMIN_PASSWORD. */
export function buildUsers(adminHash: string): UserRecord[] {
  return SEED_USERS.map((user) => ({
    id: user.id,
    name: user.name,
    email: (user.role === 'admin' ? env.adminEmail : user.email).toLowerCase(),
    passwordHash: user.role === 'admin' ? adminHash : bcrypt.hashSync(user.password, 10),
    role: user.role,
  }));
}

function annotateSeededVendors(vendors: Vendor[]): Vendor[] {
  return vendors.map((vendor) => {
    if (vendor.id === 'V-001') {
      return {
        ...vendor,
        source: 'onboarded',
        tier: 'Preferred',
        providerApplicationId: 'PRV-2026-1006',
        licenceExpiry: '2027-12-31',
        serviceStates: ['Uttar Pradesh'],
      };
    }
    return { ...vendor, source: vendor.source ?? 'seeded' };
  });
}

function freshState(adminHash: string, hashPassword: (password: string) => string = (password) => bcrypt.hashSync(password, 10)): MemoryState {
  resetDocumentDir();
  const seed = createFullSeed();
  const providerSeed = createProviderSeed();
  return {
    vendors: [...annotateSeededVendors(seed.vendors), ...providerSeed.vendors],
    applications: seed.applications,
    audits: seed.audits,
    transactions: seed.transactions,
    users: [...buildUsers(adminHash), ...toProviderUserRecords(hashPassword)],
    providerApplications: providerSeed.applications,
  };
}

export function createMemoryStore(): DataStore {
  const adminHash = bcrypt.hashSync(env.adminPassword, 10);
  const providerHash = bcrypt.hashSync('demo123', 10);
  const hashFor = (password: string) => (password === 'demo123' ? providerHash : bcrypt.hashSync(password, 10));
  let state = freshState(adminHash, hashFor);
  const clone = <T>(value: T): T => structuredClone(value);
  const withVendorName = (app: Application): Application => ({
    ...clone(app),
    vendorName: state.vendors.find((v) => v.id === app.vendorId)?.name,
  });

  return {
    mode: 'demo',
    async listVendors(filter) {
      return clone(filterVendors(state.vendors, filter));
    },
    async getVendor(id) {
      const vendor = state.vendors.find((v) => v.id === id);
      return vendor ? clone(vendor) : null;
    },
    async setVendorActive(id, active) {
      const vendor = state.vendors.find((v) => v.id === id);
      if (!vendor) return null;
      vendor.active = active;
      return clone(vendor);
    },
    async createAudit(input) {
      const audit: SolarAudit = { ...input, id: generateAuditId(), createdAt: new Date().toISOString() };
      state.audits.push(audit);
      return clone(audit);
    },
    async getAudit(id) {
      const audit = state.audits.find((a) => a.id === id);
      return audit ? clone(audit) : null;
    },
    async listAudits() {
      return clone(state.audits);
    },
    async createApplication(input) {
      const now = new Date().toISOString();
      const id = generateApplicationId(new Set(state.applications.map((a) => a.id)));
      const application: Application = {
        ...input,
        id,
        paymentMode: input.loanAmount > 0 ? 'loan' : 'upfront',
        status: 'Pending Verification',
        timeline: [
          { status: 'Submitted', note: 'Application submitted via SolarMitra', at: now, byName: 'Consumer app' },
          { status: 'Pending Verification', note: 'Documents queued for verification', at: now },
        ],
        isSeed: false,
        createdAt: now,
        updatedAt: now,
      };
      state.applications.unshift(application);
      return withVendorName(application);
    },
    async listApplications() {
      return state.applications.map(withVendorName);
    },
    async getApplication(id) {
      const app = state.applications.find((a) => a.id === id);
      return app ? withVendorName(app) : null;
    },
    async updateApplicationStatus({ id, status, event }) {
      const app = state.applications.find((a) => a.id === id);
      if (!app) return null;
      app.status = status;
      app.updatedAt = event.at;
      app.timeline.push(clone(event));
      return withVendorName(app);
    },
    async assignApplication(id, assignment) {
      const app = state.applications.find((a) => a.id === id);
      if (!app) return null;
      app.assignedTo = assignment ? clone(assignment) : undefined;
      app.updatedAt = assignment?.at ?? new Date().toISOString();
      return withVendorName(app);
    },
    async applyRepayment(id, dpd) {
      const app = state.applications.find((a) => a.id === id);
      if (!app) return null;
      const repayment = app.repayment ?? { emisDue: 0, paidOnTime: 0, paidLate: 0, paid30PlusDpd: 0, outstandingPrincipal: app.loanAmount };
      repayment.emisDue += 1;
      if (dpd > 0) {
        repayment.paidLate += 1;
        if (dpd >= 30) repayment.paid30PlusDpd += 1;
      } else {
        repayment.paidOnTime += 1;
      }
      const principalPerEmi = app.tenureMonths > 0 ? app.loanAmount / app.tenureMonths : app.loanAmount;
      repayment.outstandingPrincipal = Math.max(0, Math.round(repayment.outstandingPrincipal - principalPerEmi));
      app.repayment = repayment;
      return withVendorName(app);
    },
    async findUserByEmail(email) {
      return state.users.find((u) => u.email === email.toLowerCase()) ?? null;
    },
    async findUserById(id) {
      return state.users.find((u) => u.id === id) ?? null;
    },
    async listUsers() {
      return clone(state.users);
    },
    async listTransactions() {
      return clone(state.transactions);
    },
    async createTransaction(input) {
      const { applicantName, ...rest } = input;
      const transaction: Transaction = {
        ...rest,
        id: generateTransactionId(),
        direction: TRANSACTION_DIRECTIONS[input.kind],
        applicantName: applicantName ?? '',
        isSeed: false,
      };
      state.transactions.unshift(transaction);
      return clone(transaction);
    },
    async createUser(user) {
      state.users.push(clone(user));
      return clone(user);
    },
    async updateUser(id, patch) {
      const user = state.users.find((entry) => entry.id === id);
      if (!user) return null;
      Object.assign(user, patch);
      return clone(user);
    },
    async listProviderApplications() {
      return clone(state.providerApplications);
    },
    async getProviderApplication(id) {
      const application = state.providerApplications.find((entry) => entry.id === id);
      return application ? clone(application) : null;
    },
    async getProviderApplicationByUserId(userId) {
      const application = state.providerApplications.find((entry) => entry.userId === userId);
      return application ? clone(application) : null;
    },
    async saveProviderApplication(application) {
      const index = state.providerApplications.findIndex((entry) => entry.id === application.id);
      const copy = clone(application);
      if (index >= 0) state.providerApplications[index] = copy;
      else state.providerApplications.unshift(copy);
      return clone(copy);
    },
    async upsertVendor(vendor) {
      const index = state.vendors.findIndex((entry) => entry.id === vendor.id);
      const copy = clone(vendor);
      if (index >= 0) state.vendors[index] = copy;
      else state.vendors.push(copy);
      return clone(copy);
    },
    async patchApplication(id, patch) {
      const app = state.applications.find((entry) => entry.id === id);
      if (!app) return null;
      Object.assign(app, patch);
      app.updatedAt = new Date().toISOString();
      return withVendorName(app);
    },
    async reset() {
      state = freshState(adminHash, hashFor);
    },
  };
}
