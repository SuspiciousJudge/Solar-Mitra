import bcrypt from 'bcryptjs';
import { env } from '../config/env';
import { SEED_USERS } from '../data/historicalSeed';
import { createFullSeed } from '../data/mockDatabase';
import { TRANSACTION_DIRECTIONS, type Application, type SolarAudit, type Transaction, type UserRecord, type Vendor } from '../types';
import { generateApplicationId, generateAuditId, generateTransactionId } from '../utils/ids';
import { filterVendors, type DataStore } from './dataStore';

interface MemoryState {
  vendors: Vendor[];
  applications: Application[];
  audits: SolarAudit[];
  transactions: Transaction[];
  users: UserRecord[];
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

function freshState(adminHash: string): MemoryState {
  const seed = createFullSeed();
  return {
    vendors: seed.vendors,
    applications: seed.applications,
    audits: seed.audits,
    transactions: seed.transactions,
    users: buildUsers(adminHash),
  };
}

export function createMemoryStore(): DataStore {
  const adminHash = bcrypt.hashSync(env.adminPassword, 10);
  let state = freshState(adminHash);
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
    async reset() {
      state = freshState(adminHash);
    },
  };
}
