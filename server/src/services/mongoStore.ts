import bcrypt from 'bcryptjs';
import { env } from '../config/env';
import { createSeedApplications, createSeedVendors } from '../data/mockDatabase';
import { ApplicationModel, LeadModel, LoanModel, SolarAuditModel, UserModel, VendorModel } from '../models';
import type { ApplicationDoc } from '../models/Application';
import type { VendorDoc } from '../models/Vendor';
import type { SolarAuditDoc } from '../models/SolarAudit';
import type { Application, ApplicationStatus, SolarAudit, Vendor } from '../types';
import { generateApplicationId, generateAuditId } from '../utils/ids';
import { filterVendors, STATUS_NOTES, type DataStore } from './dataStore';

const toVendor = (doc: VendorDoc): Vendor => ({
  id: doc.code,
  name: doc.name,
  location: doc.location,
  state: doc.state,
  rating: doc.rating,
  distanceKm: doc.distanceKm,
  installations: doc.installations,
  empanelled: doc.empanelled,
  verified: doc.verified,
  active: doc.active,
  phone: doc.phone,
  yearsInBusiness: doc.yearsInBusiness,
  specialities: [...(doc.specialities ?? [])],
});

const toAudit = (doc: SolarAuditDoc): SolarAudit => ({
  id: doc.auditId,
  userId: doc.userId,
  state: doc.state,
  monthlyUnits: doc.monthlyUnits,
  monthlyBill: doc.monthlyBill,
  recommendedKW: doc.recommendedKW,
  marketCost: doc.marketCost,
  subsidy: doc.subsidy,
  centralSubsidy: doc.centralSubsidy,
  stateSupport: doc.stateSupport,
  netCost: doc.netCost,
  estimatedMonthlyGeneration: doc.estimatedMonthlyGeneration,
  estimatedMonthlySavings: doc.estimatedMonthlySavings,
  createdAt: new Date(doc.createdAt).toISOString(),
});

function toApplication(doc: ApplicationDoc, vendorNames: Map<string, string>): Application {
  return {
    id: doc.applicationId,
    applicantName: doc.applicantName,
    phone: doc.phone,
    location: doc.location,
    state: doc.state,
    auditId: doc.auditId,
    monthlyUnits: doc.monthlyUnits,
    monthlyBill: doc.monthlyBill,
    systemKW: doc.systemKW,
    marketCost: doc.marketCost,
    centralSubsidy: doc.centralSubsidy,
    stateSubsidy: doc.stateSubsidy,
    subsidy: doc.subsidy,
    netCost: doc.netCost,
    loanAmount: doc.loanAmount,
    interestRate: doc.interestRate,
    tenureMonths: doc.tenureMonths,
    emi: doc.emi,
    vendorId: doc.vendorId,
    vendorName: vendorNames.get(doc.vendorId),
    status: doc.status,
    timeline: (doc.timeline ?? []).map((e) => ({ status: e.status, note: e.note, at: e.at })),
    isSeed: doc.isSeed,
    createdAt: new Date(doc.createdAt).toISOString(),
    updatedAt: new Date(doc.updatedAt).toISOString(),
  };
}

const LOAN_STATUS: Record<ApplicationStatus, 'Requested' | 'Approved' | 'Rejected' | 'Disbursed'> = {
  'Pending Verification': 'Requested',
  Approved: 'Approved',
  Rejected: 'Rejected',
  'Installation Scheduled': 'Disbursed',
  Completed: 'Disbursed',
};

function applicationToDoc(app: Application) {
  const { id, vendorName: _vendorName, createdAt, updatedAt, ...rest } = app;
  return { ...rest, applicationId: id, createdAt: new Date(createdAt), updatedAt: new Date(updatedAt) };
}

/** Idempotent seed: safe to run repeatedly — existing records are left untouched. */
export async function seedMongo(options: { overwriteSeedApplications?: boolean } = {}): Promise<void> {
  const email = env.adminEmail.toLowerCase();
  if (!(await UserModel.exists({ email }))) {
    await UserModel.create({ name: 'Demo Operator', email, password: await bcrypt.hash(env.adminPassword, 10), role: 'admin' });
  }

  await VendorModel.bulkWrite(
    createSeedVendors().map(({ id, ...vendor }) => ({
      updateOne: { filter: { code: id }, update: { $setOnInsert: { code: id, ...vendor } }, upsert: true },
    })),
  );

  const seeds = createSeedApplications();
  await ApplicationModel.bulkWrite(
    seeds.map((app) => {
      const doc = applicationToDoc(app);
      return options.overwriteSeedApplications
        ? { replaceOne: { filter: { applicationId: app.id }, replacement: doc, upsert: true } }
        : { updateOne: { filter: { applicationId: app.id }, update: { $setOnInsert: doc }, upsert: true, timestamps: false } };
    }),
  );
  await LeadModel.bulkWrite(
    seeds.map((app) => ({
      updateOne: {
        filter: { applicationId: app.id },
        update: { $set: { name: app.applicantName, phone: app.phone, state: app.state, source: 'seed', status: app.status } },
        upsert: true,
      },
    })),
  );
  await LoanModel.bulkWrite(
    seeds.map((app) => ({
      updateOne: {
        filter: { applicationId: app.id },
        update: {
          $setOnInsert: { applicationId: app.id, principal: app.loanAmount, annualInterestRate: app.interestRate, tenureMonths: app.tenureMonths, emi: app.emi },
          $set: { status: LOAN_STATUS[app.status] },
        },
        upsert: true,
      },
    })),
  );
}

export function createMongoStore(): DataStore {
  const vendorNameMap = async () => new Map((await VendorModel.find({}, { code: 1, name: 1 }).lean()).map((v) => [v.code, v.name]));

  return {
    mode: 'mongo',
    async listVendors(filter) {
      const docs = await VendorModel.find().lean<VendorDoc[]>();
      return filterVendors(docs.map(toVendor), filter);
    },
    async getVendor(id) {
      const doc = await VendorModel.findOne({ code: id }).lean<VendorDoc>();
      return doc ? toVendor(doc) : null;
    },
    async setVendorActive(id, active) {
      const doc = await VendorModel.findOneAndUpdate({ code: id }, { active }, { new: true }).lean<VendorDoc>();
      return doc ? toVendor(doc) : null;
    },
    async createAudit(input) {
      const doc = await SolarAuditModel.create({ ...input, auditId: generateAuditId() });
      return toAudit(doc.toObject());
    },
    async getAudit(id) {
      const doc = await SolarAuditModel.findOne({ auditId: id }).lean<SolarAuditDoc>();
      return doc ? toAudit(doc) : null;
    },
    async createApplication(input) {
      const existing = new Set((await ApplicationModel.find({}, { applicationId: 1 }).lean()).map((a) => a.applicationId));
      const applicationId = generateApplicationId(existing);
      const now = new Date().toISOString();
      const doc = await ApplicationModel.create({
        ...input,
        applicationId,
        status: 'Pending Verification',
        isSeed: false,
        timeline: [
          { status: 'Submitted', note: 'Application submitted via SolarMitra', at: now },
          { status: 'Pending Verification', note: STATUS_NOTES['Pending Verification'], at: now },
        ],
      });
      await Promise.all([
        LeadModel.create({ applicationId, name: input.applicantName, phone: input.phone, state: input.state, source: 'consumer-app' }),
        LoanModel.create({ applicationId, principal: input.loanAmount, annualInterestRate: input.interestRate, tenureMonths: input.tenureMonths, emi: input.emi }),
      ]);
      return toApplication(doc.toObject(), await vendorNameMap());
    },
    async listApplications() {
      const [docs, names] = await Promise.all([ApplicationModel.find().sort({ createdAt: -1 }).lean<ApplicationDoc[]>(), vendorNameMap()]);
      return docs.map((d) => toApplication(d, names));
    },
    async getApplication(id) {
      const doc = await ApplicationModel.findOne({ applicationId: id }).lean<ApplicationDoc>();
      return doc ? toApplication(doc, await vendorNameMap()) : null;
    },
    async updateApplicationStatus(id, status, note) {
      const event = { status, note: note || STATUS_NOTES[status], at: new Date().toISOString() };
      const doc = await ApplicationModel.findOneAndUpdate(
        { applicationId: id },
        { $set: { status }, $push: { timeline: event } },
        { new: true },
      ).lean<ApplicationDoc>();
      if (!doc) return null;
      await Promise.all([
        LeadModel.updateOne({ applicationId: id }, { status }),
        LoanModel.updateOne({ applicationId: id }, { status: LOAN_STATUS[status] }),
      ]);
      return toApplication(doc, await vendorNameMap());
    },
    async findUserByEmail(email) {
      const doc = await UserModel.findOne({ email: email.toLowerCase() }).select('+password').lean();
      return doc ? { id: String(doc._id), name: doc.name, email: doc.email, passwordHash: doc.password, role: doc.role } : null;
    },
    async findUserById(id) {
      const doc = await UserModel.findById(id).lean().catch(() => null);
      return doc ? { id: String(doc._id), name: doc.name, email: doc.email, passwordHash: '', role: doc.role } : null;
    },
    async reset() {
      const newIds = (await ApplicationModel.find({ isSeed: false }, { applicationId: 1 }).lean()).map((a) => a.applicationId);
      await Promise.all([
        ApplicationModel.deleteMany({ isSeed: false }),
        LeadModel.deleteMany({ applicationId: { $in: newIds } }),
        LoanModel.deleteMany({ applicationId: { $in: newIds } }),
        SolarAuditModel.deleteMany({}),
        VendorModel.deleteMany({}),
      ]);
      await seedMongo({ overwriteSeedApplications: true });
    },
  };
}
