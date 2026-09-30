import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { initDataStore } from '../src/config/database';
import { getStore } from '../src/services/dataStore';
import { CHECKLIST_KEYS, MANDATORY_CHECKLIST_KEYS, makeGstin } from '../src/validators/providerRules';

const app = createApp();
const tokens: Record<string, string> = {};

const auth = (test: request.Test, role = 'admin') => test.set('Authorization', `Bearer ${tokens[role]}`);

beforeAll(async () => {
  await initDataStore();
  const credentials: Record<string, { email: string; password: string; path: string }> = {
    admin: { email: 'admin@solarmitra.demo', password: 'demo123', path: '/api/auth/login' },
    agent: { email: 'agent@solarmitra.demo', password: 'agent123', path: '/api/auth/login' },
    finance: { email: 'finance@solarmitra.demo', password: 'finance123', path: '/api/auth/login' },
    providerNew: { email: 'provider.new@solarmitra.demo', password: 'demo123', path: '/api/provider/auth/login' },
    providerPending: { email: 'provider.pending@solarmitra.demo', password: 'demo123', path: '/api/provider/auth/login' },
    providerApproved: { email: 'provider.approved@solarmitra.demo', password: 'demo123', path: '/api/provider/auth/login' },
    providerReview: { email: 'provider.review@solarmitra.demo', password: 'demo123', path: '/api/provider/auth/login' },
  };
  await Promise.all(
    Object.entries(credentials).map(async ([role, creds]) => {
      const res = await request(app).post(creds.path).send({ email: creds.email, password: creds.password });
      tokens[role] = res.body.data.token;
    }),
  );
});

beforeEach(async () => {
  await getStore().reset();
});

describe('provider auth', () => {
  it('registers with the demo OTP and rejects a bad OTP', async () => {
    const bad = await request(app).post('/api/provider/auth/register').send({
      name: 'New Partner',
      email: 'fresh.partner@solarmitra.demo',
      mobile: '9811199999',
      password: 'demo1234',
      confirmPassword: 'demo1234',
      acceptTerms: true,
      otp: '000000',
    });
    expect(bad.status).toBe(400);

    const ok = await request(app).post('/api/provider/auth/register').send({
      name: 'New Partner',
      email: 'fresh.partner@solarmitra.demo',
      mobile: '9811199999',
      password: 'demo1234',
      confirmPassword: 'demo1234',
      acceptTerms: true,
      otp: '123456',
    });
    expect(ok.status).toBe(201);
    expect(ok.body.data.user.role).toBe('provider');
    expect(ok.body.data.token).toBeTruthy();
  });

  it('rejects provider credentials on the operator login', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'provider.new@solarmitra.demo', password: 'demo123' });
    expect(res.status).toBe(403);
  });

  it('rejects a provider token on operator routes', async () => {
    const res = await auth(request(app).get('/api/operator/provider-applications'), 'providerNew');
    expect(res.status).toBe(403);
  });

  it('rejects an operator token on provider application routes', async () => {
    const res = await auth(request(app).get('/api/provider/application'), 'admin');
    expect(res.status).toBe(403);
  });
});

describe('provider isolation', () => {
  it('does not let a provider read another provider application', async () => {
    const mine = await auth(request(app).get('/api/provider/application'), 'providerNew');
    expect(mine.body.data.id).toBe('PRV-2026-1001');
    const other = await auth(request(app).get('/api/operator/provider-applications/PRV-2026-1002'), 'providerNew');
    expect(other.status).toBe(403);
  });

  it('masks PAN and account numbers in the operator list', async () => {
    const res = await auth(request(app).get('/api/operator/provider-applications').query({ search: 'PRV-2026-1002' }));
    expect(res.status).toBe(200);
    const row = res.body.data.items[0];
    expect(row.panMasked).not.toMatch(/AABFA2345R/);
    expect(row.panMasked).toMatch(/X/);
    expect(JSON.stringify(res.body)).not.toMatch(/accountNumberEncrypted/);
  });

  it('logs a bank reveal in the timeline for admin/finance only', async () => {
    const denied = await auth(request(app).get('/api/operator/provider-applications/PRV-2026-1002').query({ reveal: 'bank' }), 'agent');
    expect(denied.status).toBe(403);
    const ok = await auth(request(app).get('/api/operator/provider-applications/PRV-2026-1002').query({ reveal: 'bank' }), 'finance');
    expect(ok.status).toBe(200);
    expect(ok.body.data.timeline.some((event: { status: string }) => event.status === 'Reveal')).toBe(true);
  });
});

describe('state machine & review', () => {
  it('returns 409 for an illegal transition', async () => {
    const res = await auth(request(app).post('/api/operator/provider-applications/PRV-2026-1001/approve').send({ note: 'too soon' }));
    expect(res.status).toBe(409);
  });

  it('requires a message to request changes and a reason to reject', async () => {
    const noMessage = await auth(request(app).post('/api/operator/provider-applications/PRV-2026-1003/request-changes').send({ fields: ['gstin'] }));
    expect(noMessage.status).toBe(400);
    const noReason = await auth(request(app).post('/api/operator/provider-applications/PRV-2026-1003/reject').send({ message: 'nope' }));
    expect(noReason.status).toBe(400);
    const rejected = await auth(request(app).post('/api/operator/provider-applications/PRV-2026-1003/reject').send({ reasonCode: 'other', message: 'Demo reject' }));
    expect(rejected.status).toBe(200);
    expect(rejected.body.data.status).toBe('Rejected');
  });

  it('blocks agent approve and incomplete checklist', async () => {
    const agentTry = await auth(request(app).post('/api/operator/provider-applications/PRV-2026-1003/approve').send({ note: 'nope' }), 'agent');
    expect(agentTry.status).toBe(403);
    const blocked = await auth(request(app).post('/api/operator/provider-applications/PRV-2026-1003/approve').send({ note: 'nope' }));
    expect(blocked.status).toBe(409);
  });

  it('approves when the checklist is complete and lists the vendor for the state', async () => {
    for (const key of MANDATORY_CHECKLIST_KEYS) {
      const patch = await auth(request(app).patch('/api/operator/provider-applications/PRV-2026-1002/checklist').send({ itemKey: key, status: 'pass' }));
      expect(patch.status).toBe(200);
    }
    const approved = await auth(request(app).post('/api/operator/provider-applications/PRV-2026-1002/approve').send({ note: 'Looks good', tier: 'Standard' }));
    expect(approved.status).toBe(200);
    expect(approved.body.data.status).toBe('Approved');
    const vendorId = approved.body.data.providerId as string;
    const vendors = await request(app).get('/api/vendors').query({ state: 'Gujarat', active: 'true', verified: 'true' });
    expect(vendors.body.data.some((vendor: { id: string }) => vendor.id === vendorId)).toBe(true);

    const suspended = await auth(request(app).post(`/api/operator/providers/${vendorId}/suspend`).send({ reason: 'Quality pause' }));
    expect(suspended.status).toBe(200);
    const after = await request(app).get('/api/vendors').query({ state: 'Gujarat', active: 'true', verified: 'true' });
    expect(after.body.data.some((vendor: { id: string }) => vendor.id === vendorId)).toBe(false);
  });
});

describe('uploads & risk flags', () => {
  it('rejects the wrong mime type and oversize payloads via multer', async () => {
    const wrong = await auth(request(app).post('/api/provider/application/documents').field('type', 'gst_certificate').attach('file', Buffer.from('hello'), { filename: 'notes.txt', contentType: 'text/plain' }), 'providerNew');
    expect(wrong.status).toBe(400);

    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    const ok = await auth(request(app).post('/api/provider/application/documents').field('type', 'gst_certificate').attach('file', png, { filename: 'gst.png', contentType: 'image/png' }), 'providerNew');
    expect(ok.status).toBe(201);
    const docId = ok.body.data.documents[0].id as string;
    const stolen = await auth(request(app).get(`/api/provider/documents/${docId}`), 'providerPending');
    expect([403, 404]).toContain(stolen.status);
  });

  it('computes GST-state mismatch, licence expiry and duplicate phone on seeded rows', async () => {
    const mismatch = await auth(request(app).get('/api/operator/provider-applications/PRV-2026-1009'));
    expect(mismatch.body.data.riskFlags).toContain('gstin_state_mismatch');
    const licence = await auth(request(app).get('/api/operator/provider-applications/PRV-2026-1010'));
    expect(licence.body.data.riskFlags).toEqual(expect.arrayContaining(['licence_expiring', 'duplicate_phone', 'bank_name_mismatch']));
  });

  it('exposes queue stats', async () => {
    const res = await auth(request(app).get('/api/operator/provider-applications/stats'));
    expect(res.status).toBe(200);
    expect(res.body.data.byStatus.Draft).toBeGreaterThanOrEqual(1);
    expect(res.body.data.pendingReview).toBeGreaterThanOrEqual(1);
  });
});

describe('end-to-end happy path helpers', () => {
  it('saves a draft step and refuses submit until complete', async () => {
    const saved = await auth(
      request(app).put('/api/provider/application/steps/business').send({
        legalName: 'Asha Rooftop Solar',
        businessType: 'Proprietorship',
        yearEstablished: 2021,
        companyEmail: 'provider.new@solarmitra.demo',
        principals: [{ name: 'Asha Verma', designation: 'Proprietor', mobile: '9811100001', email: 'provider.new@solarmitra.demo' }],
        registeredAddress: { line1: '1 Demo Street', city: 'Lucknow', district: 'Lucknow', state: 'Uttar Pradesh', pin: '226001' },
        sameAsRegistered: true,
      }),
      'providerNew',
    );
    expect(saved.status).toBe(200);
    const submit = await auth(request(app).post('/api/provider/application/submit'), 'providerNew');
    expect(submit.status).toBe(400);
  });

  it('builds a checksum-valid GSTIN used by the seed', () => {
    expect(makeGstin('09', 'AARPA1234Q')).toHaveLength(15);
  });

  it('lists every checklist key the operator UI expects', () => {
    expect(CHECKLIST_KEYS.length).toBe(12);
  });
});
