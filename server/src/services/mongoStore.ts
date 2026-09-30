import bcrypt from 'bcryptjs';
import { env } from '../config/env';
import { SEED_USERS } from '../data/historicalSeed';
import { createFullSeed } from '../data/mockDatabase';
import {
  ApplicationModel,
  LeadModel,
  LoanModel,
  SolarAuditModel,
  TransactionModel,
  UserModel,
  VendorModel,
} from '../models';
import type { ApplicationDoc } from '../models/Application';
import type { VendorDoc } from '../models/Vendor';
import type { SolarAuditDoc } from '../models/SolarAudit';
import { TRANSACTION_DIRECTIONS, type Application, type SolarAudit, type Transaction, type Vendor } from '../types';
import { generateApplicationId, generateAuditId, generateTransactionId } from '../utils/ids';
import { filterVendors, type DataStore } from './dataStore';

const toVendor = (doc: VendorDoc): Vendor => ({
  id: doc.code,
  name: doc.name,
  location: doc.location,
  state: doc.state,
  district: doc.district,
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
  district: doc.district,
  discom: doc.discom,
  consumerName: doc.consumerName,
  consumerNumber: doc.consumerNumber,
  meterNumber: doc.meterNumber,
  billingPeriod: doc.billingPeriod,
  sanctionedLoad: doc.sanctionedLoad,
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
    consumerNumber: doc.consumerNumber,
    location: doc.location,
    state: doc.state,
    district: doc.district,
    discom: doc.discom,
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
    paymentMode: doc.paymentMode ?? (doc.loanAmount > 0 ? 'loan' : 'upfront'),
    schemeIds: [...(doc.schemeIds ?? [])],
    vendorId: doc.vendorId,
    selectedKW: doc.selectedKW,
    preferredDate: doc.preferredDate,
    preferredTime: doc.preferredTime,
    installerNote: doc.installerNote,
    consentGiven: doc.consentGiven,
    journey: doc.journey,
    vendorName: vendorNames.get(doc.vendorId),
    status: doc.status,
    timeline: (doc.timeline ?? []).map((e) => ({
      status: e.status,
      note: e.note,
      at: e.at,
      byUserId: e.byUserId,
      byName: e.byName,
      role: e.role,
      reason: e.reason,
    })),
    assignedTo: doc.assignedTo
      ? { userId: doc.assignedTo.userId, name: doc.assignedTo.name, at: doc.assignedTo.at, byUserId: doc.assignedTo.byUserId, byName: doc.assignedTo.byName }
      : undefined,
    repayment: doc.repayment
      ? {
          emisDue: doc.repayment.emisDue,
          paidOnTime: doc.repayment.paidOnTime,
          paidLate: doc.repayment.paidLate,
          paid30PlusDpd: doc.repayment.paid30PlusDpd,
          outstandingPrincipal: doc.repayment.outstandingPrincipal,
        }
      : undefined,
    estimatedMonthlyGeneration: doc.estimatedMonthlyGeneration ?? doc.systemKW * 120,
    estimatedMonthlySavings: doc.estimatedMonthlySavings ?? 0,
    isSeed: doc.isSeed,
    createdAt: new Date(doc.createdAt).toISOString(),
    updatedAt: new Date(doc.updatedAt).toISOString(),
  };
}

const LOAN_STATUS: Record<string, 'Requested' | 'Approved' | 'Rejected' | 'Disbursed'> = {
  'Pending Verification': 'Requested',
  Approved: 'Approved',
  Rejected: 'Rejected',
  'Loan Sanctioned': 'Approved',
  'Loan Disbursed': 'Disbursed',
  'Installation Scheduled': 'Disbursed',
  Installed: 'Disbursed',
  'Net Meter Commissioned': 'Disbursed',
  'Subsidy Claimed': 'Disbursed',
  'Subsidy Credited': 'Disbursed',
  Completed: 'Disbursed',
};

/** Idempotent seed: safe to run repeatedly — existing records are left untouched. */
export async function seedMongo(options: { overwriteSeedApplications?: boolean } = {}): Promise<void> {
  const users = SEED_USERS.map((user) => ({
    code: user.id,
    name: user.name,
    email: (user.role === 'admin' ? env.adminEmail : user.email).toLowerCase(),
    password: user.role === 'admin' ? env.adminPassword : user.password,
    role: user.role,
  }));
  for (const user of users) {
    const existing = await UserModel.findOne({ email: user.email }).select('+password');
    if (!existing) {
      await UserModel.create({ ...user, password: await bcrypt.hash(user.password, 10) });
    } else if (!existing.code) {
      existing.code = user.code;
      await existing.save();
    }
  }

  const seed = createFullSeed();

  await VendorModel.bulkWrite(
    seed.vendors.map(({ id, ...vendor }) => ({
      updateOne: { filter: { code: id }, update: { $setOnInsert: { code: id, ...vendor } }, upsert: true },
    })),
  );

  await ApplicationModel.bulkWrite(
    seed.applications.map((app) => {
      const { id, createdAt, updatedAt, ...rest } = app;
      const doc = { ...rest, applicationId: id, createdAt: new Date(createdAt), updatedAt: new Date(updatedAt) };
      return options.overwriteSeedApplications
        ? { replaceOne: { filter: { applicationId: id }, replacement: doc, upsert: true } }
        : { updateOne: { filter: { applicationId: id }, update: { $setOnInsert: doc }, upsert: true, timestamps: false } };
    }),
  );

  await LeadModel.bulkWrite(
    seed.leads.map((lead) => {
      const application = seed.applications.find((app) => app.id === lead.id);
      return {
        updateOne: {
          filter: { applicationId: lead.id },
          update: {
            $set: {
              name: lead.applicantName,
              phone: lead.phone,
              state: lead.state,
              district: application?.district,
              discom: application?.discom,
              assignedToUserId: application?.assignedTo?.userId,
              assignedToName: application?.assignedTo?.name,
              source: 'seed',
              status: lead.status,
            },
          },
          upsert: true,
        },
      };
    }),
  );

  await LoanModel.bulkWrite(
    seed.applications
      .filter((app) => app.loanAmount > 0)
      .map((app) => ({
        updateOne: {
          filter: { applicationId: app.id },
          update: {
            $setOnInsert: { applicationId: app.id, principal: app.loanAmount, annualInterestRate: app.interestRate, tenureMonths: app.tenureMonths, emi: app.emi },
            $set: { status: LOAN_STATUS[app.status] ?? 'Requested' },
          },
          upsert: true,
        },
      })),
  );

  await TransactionModel.bulkWrite(
    seed.transactions.map(({ id, ...transaction }) => ({
      updateOne: { filter: { transactionId: id }, update: { $setOnInsert: { transactionId: id, ...transaction } }, upsert: true, timestamps: false },
    })),
  );

  await SolarAuditModel.bulkWrite(
    seed.audits.map(({ id, createdAt, ...audit }) => ({
      updateOne: {
        filter: { auditId: id },
        update: { $setOnInsert: { ...audit, auditId: id, createdAt: new Date(createdAt) } },
        upsert: true,
        timestamps: false,
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
    async listAudits() {
      const docs = await SolarAuditModel.find().lean<SolarAuditDoc[]>();
      return docs.map(toAudit);
    },
    async createApplication(input) {
      const existing = new Set((await ApplicationModel.find({}, { applicationId: 1 }).lean()).map((a) => a.applicationId));
      const applicationId = generateApplicationId(existing);
      const now = new Date().toISOString();
      const paymentMode = input.loanAmount > 0 ? 'loan' : 'upfront';
      const doc = await ApplicationModel.create({
        ...input,
        applicationId,
        paymentMode,
        status: 'Pending Verification',
        isSeed: false,
        timeline: [
          { status: 'Submitted', note: 'Application submitted via SolarMitra', at: now, byName: 'Consumer app' },
          { status: 'Pending Verification', note: 'Documents queued for verification', at: now },
        ],
      });
      await Promise.all([
        LeadModel.create({
          applicationId,
          name: input.applicantName,
          phone: input.phone,
          state: input.state,
          district: input.district,
          discom: input.discom,
          source: 'consumer-app',
        }),
        input.loanAmount > 0
          ? LoanModel.create({ applicationId, principal: input.loanAmount, annualInterestRate: input.interestRate, tenureMonths: input.tenureMonths, emi: input.emi })
          : Promise.resolve(null),
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
    async updateApplicationStatus({ id, status, event }) {
      const doc = await ApplicationModel.findOneAndUpdate(
        { applicationId: id },
        { $set: { status, updatedAt: new Date(event.at) }, $push: { timeline: event } },
        { new: true },
      ).lean<ApplicationDoc>();
      if (!doc) return null;
      await Promise.all([
        LeadModel.updateOne({ applicationId: id }, { status }),
        LoanModel.updateOne({ applicationId: id }, { status: LOAN_STATUS[status] ?? 'Requested' }),
      ]);
      return toApplication(doc, await vendorNameMap());
    },
    async assignApplication(id, assignment) {
      const update = assignment
        ? { $set: { assignedTo: assignment, updatedAt: new Date(assignment.at) } }
        : { $unset: { assignedTo: '' }, $set: { updatedAt: new Date() } };
      const doc = await ApplicationModel.findOneAndUpdate({ applicationId: id }, update, { new: true }).lean<ApplicationDoc>();
      if (!doc) return null;
      await LeadModel.updateOne(
        { applicationId: id },
        assignment ? { assignedToUserId: assignment.userId, assignedToName: assignment.name } : { $unset: { assignedToUserId: '', assignedToName: '' } },
      );
      return toApplication(doc, await vendorNameMap());
    },
    async applyRepayment(id, dpd) {
      const doc = await ApplicationModel.findOne({ applicationId: id }).lean<ApplicationDoc>();
      if (!doc) return null;
      const repayment = doc.repayment ?? { emisDue: 0, paidOnTime: 0, paidLate: 0, paid30PlusDpd: 0, outstandingPrincipal: doc.loanAmount };
      const principalPerEmi = doc.tenureMonths > 0 ? doc.loanAmount / doc.tenureMonths : doc.loanAmount;
      const updated = await ApplicationModel.findOneAndUpdate(
        { applicationId: id },
        {
          $set: {
            repayment: {
              emisDue: repayment.emisDue + 1,
              paidOnTime: repayment.paidOnTime + (dpd > 0 ? 0 : 1),
              paidLate: repayment.paidLate + (dpd > 0 ? 1 : 0),
              paid30PlusDpd: repayment.paid30PlusDpd + (dpd >= 30 ? 1 : 0),
              outstandingPrincipal: Math.max(0, Math.round(repayment.outstandingPrincipal - principalPerEmi)),
            },
          },
        },
        { new: true },
      ).lean<ApplicationDoc>();
      return updated ? toApplication(updated, await vendorNameMap()) : null;
    },
    async findUserByEmail(email) {
      const doc = await UserModel.findOne({ email: email.toLowerCase() }).select('+password').lean();
      return doc ? { id: doc.code ?? String(doc._id), name: doc.name, email: doc.email, passwordHash: doc.password, role: doc.role } : null;
    },
    async findUserById(id) {
      const query = id.startsWith('U-') ? { code: id } : { _id: id };
      const doc = await UserModel.findOne(query).lean().catch(() => null);
      return doc ? { id: doc.code ?? String(doc._id), name: doc.name, email: doc.email, passwordHash: '', role: doc.role } : null;
    },
    async listUsers() {
      const docs = await UserModel.find({ role: { $ne: 'consumer' } }).lean();
      return docs.map((doc) => ({ id: doc.code ?? String(doc._id), name: doc.name, email: doc.email, passwordHash: '', role: doc.role }));
    },
    async listTransactions() {
      const docs = await TransactionModel.find().sort({ at: -1 }).lean();
      return docs.map((doc) => {
        const { transactionId, createdAt, updatedAt, ...rest } = doc as unknown as Transaction & { transactionId: string; createdAt: Date; updatedAt: Date };
        return { ...rest, id: transactionId, isSeed: Boolean(rest.isSeed) } as Transaction;
      });
    },
    async createTransaction(input) {
      const { applicantName, ...rest } = input;
      const transactionId = generateTransactionId();
      const doc = await TransactionModel.create({
        ...rest,
        transactionId,
        direction: TRANSACTION_DIRECTIONS[input.kind],
        applicantName: applicantName ?? '',
        isSeed: false,
      });
      const { transactionId: id, createdAt, updatedAt, ...rest2 } = doc.toObject() as unknown as Transaction & { transactionId: string; createdAt: Date; updatedAt: Date };
      return { ...rest2, id, isSeed: false } as Transaction;
    },
    async reset() {
      await Promise.all([
        ApplicationModel.deleteMany({}),
        LeadModel.deleteMany({}),
        LoanModel.deleteMany({}),
        TransactionModel.deleteMany({}),
        SolarAuditModel.deleteMany({}),
        VendorModel.deleteMany({}),
      ]);
      await seedMongo({ overwriteSeedApplications: true });
    },
  };
}
