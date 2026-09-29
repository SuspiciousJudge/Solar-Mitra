import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { initDataStore } from '../src/config/database';
import { INDIA_REGIONS } from '../src/data/indiaRegions';
import { getStore } from '../src/services/dataStore';

const app = createApp();
const tokens: Record<string, string> = {};

const validApplication = {
  applicantName: 'Ramesh Kumar',
  phone: '9876543210',
  consumerNumber: 'PVVNL/UP/778812',
  location: 'Kanpur, Uttar Pradesh',
  state: 'Uttar Pradesh',
  district: 'Kanpur Nagar',
  monthlyUnits: 350,
  monthlyBill: 2800,
  vendorId: 'V-001',
  loanAmount: 57000,
  interestRate: 7.5,
  tenureMonths: 36,
};

const auth = (test: request.Test, role = 'admin') => test.set('Authorization', `Bearer ${tokens[role]}`);

beforeAll(async () => {
  await initDataStore();
  const credentials: Record<string, { email: string; password: string }> = {
    admin: { email: 'admin@solarmitra.demo', password: 'demo123' },
    agent: { email: 'agent@solarmitra.demo', password: 'agent123' },
    finance: { email: 'finance@solarmitra.demo', password: 'finance123' },
  };
  await Promise.all(
    Object.entries(credentials).map(async ([role, creds]) => {
      const res = await request(app).post('/api/auth/login').send(creds);
      tokens[role] = res.body.data.token;
    }),
  );
});

beforeEach(async () => {
  await getStore().reset();
});

describe('health & response format', () => {
  it('reports demo mode', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, data: { status: 'ok', demoMode: true } });
  });

  it('returns consistent 404 errors', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(typeof res.body.message).toBe('string');
  });
});

describe('auth & roles', () => {
  it('rejects bad credentials with a generic message', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@solarmitra.demo', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ success: false, message: 'Invalid email or password' });
  });

  it('signs in each seeded operator role', async () => {
    const me = await auth(request(app).get('/api/auth/me'), 'finance');
    expect(me.body.data).toMatchObject({ email: 'finance@solarmitra.demo', role: 'finance' });
    expect(me.body.data.passwordHash).toBeUndefined();
  });

  it('protects operator routes', async () => {
    expect((await request(app).get('/api/leads')).status).toBe(401);
  });

  it('lists operators for reassignment', async () => {
    const res = await auth(request(app).get('/api/users'));
    expect(res.body.data.map((user: { role: string }) => user.role).sort()).toEqual(['admin', 'agent', 'finance']);
  });

  it('only lets admins reset the demo', async () => {
    expect((await auth(request(app).post('/api/demo/reset'), 'agent')).status).toBe(403);
    expect((await auth(request(app).post('/api/demo/reset'), 'finance')).status).toBe(403);
    expect((await auth(request(app).post('/api/demo/reset'), 'admin')).status).toBe(200);
  });
});

describe('vendors & audits', () => {
  it('lists active UP vendors sorted by distance', async () => {
    const res = await request(app).get('/api/vendors').query({ state: 'Uttar Pradesh', active: 'true' });
    expect(res.body.data.map((v: { id: string }) => v.id)).toEqual(['V-001', 'V-002', 'V-003']);
  });

  it('covers every state and UT with at least one vendor', async () => {
    const res = await request(app).get('/api/vendors');
    expect(res.body.data.length).toBeGreaterThanOrEqual(36);
  });

  it('computes an audit server-side', async () => {
    const res = await request(app).post('/api/audits').send({ state: 'Uttar Pradesh', monthlyUnits: 350, monthlyBill: 2800 });
    expect(res.status).toBe(201);
    expect(res.body.data.recommendation).toMatchObject({ recommendedKW: 3, netCost: 57000 });
    expect(INDIA_REGIONS.find((region) => region.name === 'Uttar Pradesh')?.districts).toContain(res.body.data.audit.district);
  });

  it('accepts 0 units and returns a zero recommendation', async () => {
    const res = await request(app).post('/api/audits').send({ state: 'Uttar Pradesh', monthlyUnits: 0 });
    expect(res.status).toBe(201);
    expect(res.body.data.recommendation.recommendedKW).toBe(0);
  });
});

describe('applications & leads', () => {
  it('creates an application with recomputed figures', async () => {
    const res = await request(app).post('/api/applications').send({ ...validApplication, systemKW: 99 });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ systemKW: 3, netCost: 57000, status: 'Pending Verification', paymentMode: 'loan' });
    expect(res.body.data.id).toMatch(/^SM-\d{4}-\d{4}$/);
    expect(Math.abs(res.body.data.emi - 1770)).toBeLessThan(10);
    expect(res.body.data.schemeIds).toContain('pm-surya-ghar-rts');
    expect(res.body.data.schemeIds).toContain('up-rts-topup');
  });

  it('marks an upfront application as upfront and skips loan schemes', async () => {
    const res = await request(app).post('/api/applications').send({ ...validApplication, loanAmount: 0, tenureMonths: 0, paymentMode: undefined });
    expect(res.body.data.paymentMode).toBe('upfront');
    expect(res.body.data.emi).toBe(0);
  });

  it('recomputes cost and support for a selected alternative system size', async () => {
    const res = await request(app).post('/api/applications').send({ ...validApplication, selectedKW: 4, loanAmount: 20000 });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ systemKW: 4, marketCost: 215000, centralSubsidy: 78000, stateSubsidy: 30000, netCost: 107000 });
  });

  it('rejects unsupported selected system sizes', async () => {
    const res = await request(app).post('/api/applications').send({ ...validApplication, selectedKW: 11 });
    expect(res.status).toBe(400);
  });

  it('rejects invalid phone numbers', async () => {
    const res = await request(app).post('/api/applications').send({ ...validApplication, phone: '12345' });
    expect(res.status).toBe(400);
  });

  it('rejects loans larger than the net cost', async () => {
    expect((await request(app).post('/api/applications').send({ ...validApplication, loanAmount: 90000 })).status).toBe(400);
  });

  it('rejects inactive vendors', async () => {
    expect((await request(app).post('/api/applications').send({ ...validApplication, vendorId: 'V-007' })).status).toBe(400);
  });

  it('warns about duplicates on the same phone or consumer number', async () => {
    const first = await request(app).post('/api/applications').send(validApplication);
    expect(first.body.data.duplicates).toBeUndefined();
    const second = await request(app).post('/api/applications').send({ ...validApplication, applicantName: 'Suresh Kumar' });
    expect(second.status).toBe(201);
    expect(second.body.data.duplicates).toHaveLength(1);
    expect(second.body.data.duplicates[0]).toMatchObject({ applicationId: first.body.data.id, matchedOn: 'phone' });

    const check = await request(app).get('/api/applications/duplicates').query({ consumerNumber: 'PVVNL/UP/778812' });
    expect(check.body.data.duplicates.length).toBe(2);
  });

  it('filters leads by state, status, payment mode, district and scheme', async () => {
    const res = await auth(request(app).get('/api/leads').query({ state: 'Gujarat', paymentMode: 'loan', limit: 100 }));
    expect(res.body.data.total).toBeGreaterThan(0);
    res.body.data.items.forEach((item: { state: string; paymentMode: string }) => {
      expect(item.state).toBe('Gujarat');
      expect(item.paymentMode).toBe('loan');
    });

    const byScheme = await auth(request(app).get('/api/leads').query({ scheme: 'gj-rts-topup', limit: 5 }));
    expect(byScheme.body.data.total).toBeGreaterThan(0);

    const byDistrict = await auth(request(app).get('/api/leads').query({ state: 'Gujarat', district: 'Rajkot', limit: 5 }));
    expect(byDistrict.body.data.total).toBeGreaterThan(0);
    expect(byDistrict.body.data.items[0].district).toBe('Rajkot');
  });

  it('exposes waiting time and an SLA flag on every lead', async () => {
    const res = await auth(request(app).get('/api/leads').query({ status: 'Pending Verification', limit: 5 }));
    expect(res.body.data.items[0].ageing).toMatchObject({ slaHours: 48 });
    expect(typeof res.body.data.items[0].ageing.waitingLabel).toBe('string');
  });
});

describe('status state machine', () => {
  const create = async (overrides: Record<string, unknown> = {}) => {
    const res = await request(app).post('/api/applications').send({ ...validApplication, ...overrides });
    return res.body.data.id as string;
  };

  it('walks a financed application through the loan steps', async () => {
    const id = await create();
    await auth(request(app).patch(`/api/leads/${id}/status`).send({ status: 'Approved' }));
    const sanction = await auth(request(app).patch(`/api/leads/${id}/status`).send({ status: 'Loan Sanctioned' }), 'finance');
    expect(sanction.status).toBe(200);
    expect(sanction.body.data.timeline.at(-1)).toMatchObject({ status: 'Loan Sanctioned', role: 'finance' });

    const disburse = await auth(request(app).patch(`/api/leads/${id}/status`).send({ status: 'Loan Disbursed' }), 'finance');
    expect(disburse.body.data.status).toBe('Loan Disbursed');
    expect(disburse.body.data.timeline.at(-1)).toMatchObject({ status: 'Loan Disbursed', byName: 'Ravi Menon' });
  });

  it('answers an illegal jump with 409 and a clear message', async () => {
    const id = await create();
    const res = await auth(request(app).patch(`/api/leads/${id}/status`).send({ status: 'Installed' }));
    expect(res.status).toBe(409);
    expect(res.body.message).toContain('Cannot move from');
    expect(res.body.message).toContain('Approved');
  });

  it('stops a financed application skipping straight to installation', async () => {
    const id = await create();
    await auth(request(app).patch(`/api/leads/${id}/status`).send({ status: 'Approved' }));
    const res = await auth(request(app).patch(`/api/leads/${id}/status`).send({ status: 'Installation Scheduled' }));
    expect(res.status).toBe(409);
    expect(res.body.message).toContain('sanctioned and disbursed');
  });

  it('lets upfront applications skip the loan steps', async () => {
    const id = await create({ loanAmount: 0, tenureMonths: 0 });
    await auth(request(app).patch(`/api/leads/${id}/status`).send({ status: 'Approved' }));
    const res = await auth(request(app).patch(`/api/leads/${id}/status`).send({ status: 'Installation Scheduled' }));
    expect(res.status).toBe(200);
  });

  it('never lets anyone skip from Approved to a live/completed state', async () => {
    const id = await create();
    await auth(request(app).patch(`/api/leads/${id}/status`).send({ status: 'Approved' }));
    for (const status of ['Completed', 'Subsidy Credited', 'Net Meter Commissioned']) {
      expect((await auth(request(app).patch(`/api/leads/${id}/status`).send({ status }))).status).toBe(409);
    }
  });

  it('requires a reason to reject and records it on the timeline', async () => {
    const id = await create();
    const missing = await auth(request(app).patch(`/api/leads/${id}/status`).send({ status: 'Rejected' }));
    expect(missing.status).toBe(400);
    expect(missing.body.message).toBe('A rejection reason is required');

    const other = await auth(request(app).patch(`/api/leads/${id}/status`).send({ status: 'Rejected', reason: 'Other' }));
    expect(other.status).toBe(400);

    const rejected = await auth(request(app).patch(`/api/leads/${id}/status`).send({ status: 'Rejected', reason: 'Roof not suitable', note: 'North-facing slab' }));
    expect(rejected.status).toBe(200);
    expect(rejected.body.data.timeline.at(-1)).toMatchObject({ status: 'Rejected', reason: 'Roof not suitable' });
    expect(rejected.body.data.timeline.at(-1).note).toContain('North-facing slab');
  });

  it('rejects unknown statuses and terminal-state moves', async () => {
    const id = await create();
    const unknown = await auth(request(app).patch(`/api/leads/${id}/status`).send({ status: 'Teleported' }));
    expect(unknown.status).toBe(400);
    expect(unknown.body.message).toBe('Unknown application status');

    await auth(request(app).patch(`/api/leads/${id}/status`).send({ status: 'Rejected', reason: 'Duplicate' }));
    const afterReject = await auth(request(app).patch(`/api/leads/${id}/status`).send({ status: 'Approved' }));
    expect(afterReject.status).toBe(409);
  });

  it('restricts agents to their own assigned leads and blocks disbursement', async () => {
    const id = await create();
    const agentAttempt = await auth(request(app).patch(`/api/leads/${id}/status`).send({ status: 'Approved' }), 'agent');
    expect(agentAttempt.status).toBe(403);
    expect(agentAttempt.body.message).toContain('assigned');

    await auth(request(app).patch(`/api/leads/${id}/assign`).send({ assignToMe: false, userId: 'U-AGENT-1' }));
    const approved = await auth(request(app).patch(`/api/leads/${id}/status`).send({ status: 'Approved' }), 'agent');
    expect(approved.status).toBe(200);
    expect(approved.body.data.timeline.at(-1)).toMatchObject({ role: 'agent', byName: 'Priya Nair' });

    // The loan must be sanctioned first (409), and even then an agent cannot disburse (403).
    expect((await auth(request(app).patch(`/api/leads/${id}/status`).send({ status: 'Loan Disbursed' }), 'agent')).status).toBe(409);
    await auth(request(app).patch(`/api/leads/${id}/status`).send({ status: 'Loan Sanctioned' }), 'finance');
    const disbursement = await auth(request(app).patch(`/api/leads/${id}/status`).send({ status: 'Loan Disbursed' }), 'agent');
    expect(disbursement.status).toBe(403);
  });

  it('lets a finance user sanction but not approve', async () => {
    const id = await create();
    expect((await auth(request(app).patch(`/api/leads/${id}/status`).send({ status: 'Approved' }), 'finance')).status).toBe(403);
    await auth(request(app).patch(`/api/leads/${id}/status`).send({ status: 'Approved' }));
    expect((await auth(request(app).patch(`/api/leads/${id}/status`).send({ status: 'Loan Sanctioned' }), 'finance')).status).toBe(200);
  });
});

describe('assignment', () => {
  it('assigns and unassigns leads (admin)', async () => {
    const created = await request(app).post('/api/applications').send(validApplication);
    const id = created.body.data.id;
    expect(created.body.data.assignedTo).toBeUndefined();

    const assigned = await auth(request(app).patch(`/api/leads/${id}/assign`).send({ userId: 'U-AGENT-1' }));
    expect(assigned.body.data.assignedTo).toMatchObject({ userId: 'U-AGENT-1', name: 'Priya Nair', byName: 'Demo Operator' });

    const unassigned = await auth(request(app).patch(`/api/leads/${id}/assign`).send({ userId: null }));
    expect(unassigned.body.data.assignedTo).toBeUndefined();
  });

  it('stops agents reassigning to someone else', async () => {
    const created = await request(app).post('/api/applications').send(validApplication);
    const res = await auth(request(app).patch(`/api/leads/${created.body.data.id}/assign`).send({ userId: 'U-FIN-1' }), 'agent');
    expect(res.status).toBe(403);
  });
});

describe('transactions (money flow)', () => {
  it('lists transactions with totals and filters', async () => {
    const res = await auth(request(app).get('/api/transactions').query({ kind: 'Loan Disbursed', limit: 5, state: 'Uttar Pradesh' }));
    expect(res.body.data.total).toBeGreaterThan(0);
    expect(res.body.data.totals.outflowINR).toBeGreaterThan(0);
    res.body.data.items.forEach((item: { kind: string; state: string }) => {
      expect(item.kind).toBe('Loan Disbursed');
      expect(item.state).toBe('Uttar Pradesh');
    });
  });

  it('records a transaction and updates repayment health', async () => {
    const created = await request(app).post('/api/applications').send(validApplication);
    const id = created.body.data.id;
    const created2 = await auth(request(app).post('/api/transactions').send({ applicationId: id, kind: 'EMI Repayment', amountINR: 1773, dpd: 0 }), 'finance');
    expect(created2.status).toBe(201);
    expect(created2.body.data).toMatchObject({ kind: 'EMI Repayment', direction: 'inflow', role: 'finance' });

    const application = await auth(request(app).get(`/api/applications/${id}`));
    expect(application.body.data.repayment).toMatchObject({ emisDue: 1, paidOnTime: 1, paid30PlusDpd: 0 });
  });

  it('blocks agents from recording transactions', async () => {
    const created = await request(app).post('/api/applications').send(validApplication);
    const res = await auth(request(app).post('/api/transactions').send({ applicationId: created.body.data.id, kind: 'EMI Repayment', amountINR: 100 }), 'agent');
    expect(res.status).toBe(403);
  });

  it('validates transaction payloads', async () => {
    const res = await auth(request(app).post('/api/transactions').send({ applicationId: 'SM-2026-1001', kind: 'Bribe', amountINR: -5 }), 'finance');
    expect(res.status).toBe(400);
  });
});

describe('CSV exports', () => {
  it('exports the filtered leads with the audit columns', async () => {
    const res = await auth(request(app).get('/api/leads/export.csv').query({ state: 'Gujarat', paymentMode: 'loan' }));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    const [header, ...rows] = res.text.replace(/^\uFEFF/, '').split('\r\n').filter(Boolean);
    expect(header).toContain('Waiting for');
    expect(header).toContain('SLA');
    expect(rows.length).toBeGreaterThan(0);
    rows.forEach((row) => expect(row).toContain('Gujarat'));
  });

  it('exports transactions', async () => {
    const res = await auth(request(app).get('/api/transactions/export.csv').query({ kind: 'Loan Disbursed' }));
    const [header, ...rows] = res.text.replace(/^\uFEFF/, '').split('\r\n').filter(Boolean);
    expect(header).toContain('Days past due');
    expect(rows.length).toBeGreaterThan(0);
  });
});

describe('schemes catalogue', () => {
  it('serves a labelled, versioned catalogue', async () => {
    const res = await request(app).get('/api/schemes');
    expect(res.body.data.disclaimer).toBe('Demo policy assumption — verify against the official portal');
    expect(res.body.data.schemes.length).toBeGreaterThan(20);
    res.body.data.schemes.forEach((scheme: { isDemoAssumption: boolean }) => expect(scheme.isDemoAssumption).toBe(true));
  });

  it('filters by state and level', async () => {
    const res = await request(app).get('/api/schemes').query({ state: 'Gujarat' });
    expect(res.body.data.schemes.map((scheme: { id: string }) => scheme.id)).toContain('gj-rts-topup');
    const central = await request(app).get('/api/schemes').query({ level: 'central' });
    central.body.data.schemes.forEach((scheme: { level: string }) => expect(scheme.level).toBe('central'));
  });
});
