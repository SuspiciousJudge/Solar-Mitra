import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { initDataStore } from '../src/config/database';
import { getStore } from '../src/services/dataStore';

const app = createApp();
let token = '';

const validApplication = {
  applicantName: 'Ramesh Kumar',
  phone: '9876543210',
  location: 'Kanpur, Uttar Pradesh',
  state: 'Uttar Pradesh',
  monthlyUnits: 350,
  monthlyBill: 2800,
  vendorId: 'V-001',
  loanAmount: 57000,
  interestRate: 7.5,
  tenureMonths: 36,
};

beforeAll(async () => {
  await initDataStore();
  const res = await request(app).post('/api/auth/login').send({ email: 'admin@solarmitra.demo', password: 'demo123' });
  token = res.body.data.token;
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

describe('auth', () => {
  it('rejects bad credentials with a generic message', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@solarmitra.demo', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ success: false, message: 'Invalid email or password' });
  });

  it('validates login input', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'not-an-email', password: '' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Enter a valid email address');
  });

  it('protects operator routes', async () => {
    expect((await request(app).get('/api/leads')).status).toBe(401);
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.body.data.email).toBe('admin@solarmitra.demo');
    expect(me.body.data.passwordHash).toBeUndefined();
  });
});

describe('vendors & audits', () => {
  it('lists active UP vendors sorted by distance', async () => {
    const res = await request(app).get('/api/vendors').query({ state: 'Uttar Pradesh', active: 'true' });
    expect(res.body.data.map((v: { id: string }) => v.id)).toEqual(['V-001', 'V-002', 'V-003']);
  });

  it('computes an audit server-side', async () => {
    const res = await request(app).post('/api/audits').send({ state: 'Uttar Pradesh', monthlyUnits: 350, monthlyBill: 2800 });
    expect(res.status).toBe(201);
    expect(res.body.data.recommendation).toMatchObject({ recommendedKW: 3, netCost: 57000 });
  });

  it('rejects 0 units', async () => {
    const res = await request(app).post('/api/audits').send({ state: 'Uttar Pradesh', monthlyUnits: 0 });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Monthly consumption must be greater than 0');
  });
});

describe('applications & leads', () => {
  it('creates an application with recomputed figures', async () => {
    const res = await request(app).post('/api/applications').send({ ...validApplication, systemKW: 99 });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ systemKW: 3, netCost: 57000, status: 'Pending Verification' });
    expect(res.body.data.id).toMatch(/^SM-\d{4}-\d{4}$/);
    expect(Math.abs(res.body.data.emi - 1770)).toBeLessThan(10);
  });

  it('rejects invalid phone numbers', async () => {
    const res = await request(app).post('/api/applications').send({ ...validApplication, phone: '12345' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Enter a valid 10-digit Indian mobile number');
  });

  it('rejects loans larger than the net cost', async () => {
    const res = await request(app).post('/api/applications').send({ ...validApplication, loanAmount: 90000 });
    expect(res.status).toBe(400);
  });

  it('rejects inactive vendors', async () => {
    const res = await request(app).post('/api/applications').send({ ...validApplication, vendorId: 'V-007' });
    expect(res.status).toBe(400);
  });

  it('shows new applications in leads and approves them', async () => {
    const created = await request(app).post('/api/applications').send(validApplication);
    const id = created.body.data.id;
    const leads = await request(app).get('/api/leads').set('Authorization', `Bearer ${token}`);
    expect(leads.body.data.items[0].id).toBe(id);

    const approved = await request(app)
      .patch(`/api/leads/${id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'Approved' });
    expect(approved.body.data.status).toBe('Approved');

    const overview = await request(app).get('/api/analytics/overview').set('Authorization', `Bearer ${token}`);
    expect(overview.body.data.households).toBe(1241);
  });

  it('filters, searches and paginates leads', async () => {
    const res = await request(app)
      .get('/api/leads')
      .query({ state: 'Gujarat', limit: 1 })
      .set('Authorization', `Bearer ${token}`);
    expect(res.body.data.total).toBe(2);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.pages).toBe(2);
  });

  it('rejects unknown statuses', async () => {
    const res = await request(app)
      .patch('/api/leads/SM-2026-1001/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'Teleported' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Unknown application status');
  });
});
