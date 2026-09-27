import bcrypt from 'bcryptjs';
import { env } from '../config/env';
import { createSeedApplications, createSeedVendors } from '../data/mockDatabase';
import type { Application, SolarAudit, UserRecord, Vendor } from '../types';
import { generateApplicationId, generateAuditId } from '../utils/ids';
import { filterVendors, STATUS_NOTES, type DataStore } from './dataStore';

interface MemoryState {
  vendors: Vendor[];
  applications: Application[];
  audits: SolarAudit[];
  users: UserRecord[];
}

function freshState(adminHash: string): MemoryState {
  return {
    vendors: createSeedVendors(),
    applications: createSeedApplications(),
    audits: [],
    users: [{ id: 'U-ADMIN', name: 'Demo Operator', email: env.adminEmail.toLowerCase(), passwordHash: adminHash, role: 'admin' }],
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
    async createApplication(input) {
      const now = new Date().toISOString();
      const id = generateApplicationId(new Set(state.applications.map((a) => a.id)));
      const application: Application = {
        ...input,
        id,
        status: 'Pending Verification',
        timeline: [
          { status: 'Submitted', note: 'Application submitted via SolarMitra', at: now },
          { status: 'Pending Verification', note: STATUS_NOTES['Pending Verification'], at: now },
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
    async updateApplicationStatus(id, status, note) {
      const app = state.applications.find((a) => a.id === id);
      if (!app) return null;
      const now = new Date().toISOString();
      app.status = status;
      app.updatedAt = now;
      app.timeline.push({ status, note: note || STATUS_NOTES[status], at: now });
      return withVendorName(app);
    },
    async findUserByEmail(email) {
      return state.users.find((u) => u.email === email.toLowerCase()) ?? null;
    },
    async findUserById(id) {
      return state.users.find((u) => u.id === id) ?? null;
    },
    async reset() {
      state = freshState(adminHash);
    },
  };
}
