# ☀️ SolarMitra — *Your Solar Friend*

> **SANKALP by Satin Finserv — The Climate Edition** · Theme: *Sustainable Cities & Rural Energy Transition*

**Tagline:** *Your roof can power your future.*

SolarMitra helps households find out whether rooftop solar makes sense for them, understand the subsidies they may get, compare paying upfront with a Satin Finserv green loan, and book a verified installer — in one mobile-first, multilingual flow. Operators (lender, field agents, finance desk) get a dashboard that traces every file and every rupee from the first solar audit to the subsidy credited to the household.

---

## 1. The problem

Rural and semi-urban households spend a large share of their income on electricity. Rooftop solar with government subsidies can cut that bill sharply, but most families never get started because:

| Barrier | What it looks like |
| --- | --- |
| **Information** | "How big a system do I need? What does it cost?" |
| **Subsidy confusion** | Central and state schemes, eligibility, paperwork |
| **Upfront cost** | ₹1–2 lakh is out of reach even after subsidy |
| **Trust** | "Which installer is genuine?" |
| **Language & digital literacy** | Most tools are English-only and full of jargon |

## 2. The solution

A guided eight-stage flow goes from **electricity details → personal & KYC → property → solar preferences → solar plan → financing → verified installer → review & tracking**:

1. **Pick a language**: English, हिंदी, ગુજરાતી, தமிழ் (saved on the device)
2. **Enter electricity details**: choose simulated bill OCR or enter units, state, and bill manually
3. **Add personal and property details**: review each stage separately; progress is saved on the device
4. **Explore a solar plan**: compare neighboring system sizes with configured costs, central/state support, contribution, savings, and environmental estimates
5. **Choose payment terms**: compare upfront payment with 12-, 24-, and 36-month illustrative financing
6. **Select an installer and submit**: review the application and required consents before submission
7. **Track the application**: see its privacy-safe status timeline; operators can review application details in the admin console

**For operators:** one console where the same filters drive every KPI, chart, table and CSV export — so the numbers can never disagree.

- **Dashboard** — climate, finance, subsidy and queue KPIs with period-over-period change, impact story, funnel and charts
- **Leads / Applications** — filterable pipeline with SLA ageing, duplicate warnings, assignment, and role-aware next actions
- **Money flow** — ledger of every sanction, disbursement, EMI, subsidy movement and vendor payout, plus CSV export
- **Vendors** — enable/disable partners, see empanelment status
- **Climate impact** — all 36 states/UTs, monthly series, CO₂ avoided with a labelled methodology
- **Settings** — reset the demo, inspect the dataset

### Operator roles (enforced by the API, mirrored in the UI)

| Role | Can do | Cannot do |
| --- | --- | --- |
| **Admin** | Everything: approve/reject, assign leads, sanction/disburse, record transactions, reset demo | — |
| **Agent** | Verify/approve/reject **only files assigned to them**, claim unassigned files ("Assign to me") | Sanction/disburse loans, credit subsidy, record transactions, reset demo |
| **Finance** | Sanction loans, disburse, credit subsidy, record EMI/repayment transactions | Approve/reject leads, reset demo |

---

## 3. Quick start

**Requirements:** Node.js ≥ 18.18 (tested on Node 22), npm. **No MongoDB and no API keys needed.**

```bash
npm install      # installs root, server and client (via postinstall)
npm run dev      # starts API (:5000) + web app (:5173) together
```

Then open **http://localhost:5173**.

| URL | What |
| --- | --- |
| http://localhost:5173/ | Landing page |
| http://localhost:5173/consumer | Consumer app (mobile-first; shown in a phone frame on desktop) |
| http://localhost:5173/admin/login | Operator console |
| http://localhost:5000/api/health | API health check |

### Demo credentials

| Role | Email | Password | Seeded persona |
| --- | --- | --- | --- |
| Admin | `admin@solarmitra.demo` | `demo123` | Demo Operator |
| Agent | `agent@solarmitra.demo` | `agent123` | Priya Nair (field agent) |
| Finance | `finance@solarmitra.demo` | `finance123` | Ravi Menon (finance desk) |

The login page has a **"Use demo credentials"** button for each role. The consumer `/login` page simulates phone OTP; use **`123456`**.

> These credentials only exist in the seeded demo data. Change or remove them before any real deployment.

---

## 4. Demo mode vs MongoDB

| `DEMO_MODE` | Behaviour |
| --- | --- |
| `true` *(default)* | Deterministic in-memory dataset — nothing to install. The admin header shows a subtle **Demo Mode** badge. Data resets when the server restarts or from **Settings → Reset demo data**. |
| `false` | Uses MongoDB via Mongoose. If MongoDB can't be reached, the API logs the reason and **falls back to demo data** so a live demo never breaks (`/api/health` then reports `database: "fallback-demo"`). |

**What the demo dataset contains** (deterministic, generated from seed `20260101`, window **1 Jan → 26 Sep 2026**):

| Records | Count | Notes |
| --- | --- | --- |
| Applications | **1,260** (10 handwritten story leads + 1,250 generated) | spread over UP, GJ, TN, RJ, MH, KA, WB, MP, HR, PB, BR + more; ~54% financed |
| Solar audits | **1,900** | every application is preceded by its own audit; the rest never converted |
| Transactions | **~3,570** | loan sanctions/disbursements, EMIs (with DPD), subsidy claimed/credited, upfront payments, vendor payouts |
| Vendors | **39** | 3 handwritten Kanpur partners + 36 generated (one per state/UT, some inactive) |
| Schemes | **33** | central + state catalogue, version `2026.09-demo.1`, every entry labelled a demo assumption |

### Using MongoDB

```bash
docker compose up -d                 # starts mongo:7 on :27017 (or use a local/Atlas instance)
cp server/.env.example server/.env   # then set DEMO_MODE=false and a real JWT_SECRET
npm run seed                         # idempotent: safe to run repeatedly
npm run dev
```

### Environment variables

**`server/.env`** (copy from `server/.env.example`)

| Variable | Default | Notes |
| --- | --- | --- |
| `PORT` | `5000` | API port |
| `MONGO_URI` | `mongodb://localhost:27017/solarmitra` | Only used when `DEMO_MODE=false` |
| `JWT_SECRET` | `change_this_secret` | **Required** when `DEMO_MODE=false`. In demo mode an ephemeral secret is generated if unset (admin sessions then end when the server restarts). |
| `DEMO_MODE` | `true` | See above |
| `CLIENT_URL` | `http://localhost:5173` | CORS allow-list (comma separated) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | demo values | Optional overrides for the seeded admin |

**`client/.env`** (copy from `client/.env.example`, optional)

| Variable | Default | Notes |
| --- | --- | --- |
| `VITE_API_URL` | `/api` | Keep `/api`: the browser calls its own origin and Vite proxies to `:5000`, which works on localhost, LAN phones and tunnelled preview URLs. |
| `VITE_DEMO_MODE` | `true` | If the API is unreachable, the consumer flow keeps working with bundled demo vendors and a local application ID |

No secrets are committed. `.env` files are git-ignored.

---

## 5. Demo values and checks

Run with the default `DEMO_MODE=true` setting; MongoDB and API keys are not needed. The consumer journey starts with synthetic values already filled in, so you can press **Continue** through the stages without entering test data.

| Field | Default demo value |
| --- | --- |
| Electricity | Uttar Pradesh · 350 kWh/month · ₹2,800/month |
| Consumer / DISCOM | `DEMO-0001` · Demo DISCOM |
| Personal | Demo Household · `9876543210` · `demo@example.test` · `1990-01-01` |
| KYC | Other accepted ID · `DEMO-ID-001` (demo collection only) |
| Property | Demo Solar Street, Kanpur · Uttar Pradesh · `208001` |
| Solar | 3 kW recommended · battery No · financing · 36 months |
| Installer | First active vendor for Uttar Pradesh (selected after the installer list loads) |

The values are editable. At the final review, tick both consent boxes to enable submission. If you switch the KYC type to Aadhaar or PAN, enter a synthetic test value in the expected format; never use a real identity number. No KYC number or selected document/photo file is sent to the API. Bill OCR remains simulated.

For a full run: start with `npm run dev`, visit <http://localhost:5173/>, continue through all eight stages, submit, check the status from **Track My Application**, then open <http://localhost:5173/admin/login> and use **Use demo credentials** to inspect and update the application. **Settings → Reset demo data** clears the current run. In-memory application data also resets when the server restarts.

Run `npm test` and `npm run build` from the repository root to check the calculator/API tests and both production builds. The public tracking endpoint returns only the privacy-safe status view; application journey details are available only through authenticated admin routes. DOB is excluded from the browser draft and masked by default in admin.

---

## 6. Architecture

```mermaid
flowchart LR
  subgraph Client["client/ — React + TS + Vite"]
    Pages["Pages<br/>(consumer, admin, auth)"] --> Ctx["Contexts<br/>Language · Consumer · Auth · Demo"]
    Pages --> Hooks["Hooks<br/>useAsync · useAnalytics · useOperatorFilters · useStatusUpdate"]
    Hooks --> Svc["services/*<br/>(Axios)"]
    Pages --> Calc1["utils/solarCalculator · statusFlow · ageing"]
  end
  Svc -- "/api (Vite proxy)" --> API
  subgraph Server["server/ — Express + TS"]
    API["routes"] --> MW["helmet · cors · rate-limit<br/>zod validate · JWT auth · roles"]
    MW --> Ctrl["controllers"]
    Ctrl --> Domain["services<br/>solarCalculator · statusMachine · filters · analyticsService<br/>duplicates · leadQuery · csv"]
    Ctrl --> Store{"DataStore"}
    Store -->|DEMO_MODE=true| Mem["memoryStore<br/>(deterministic seed)"]
    Store -->|DEMO_MODE=false| Mongo["mongoStore<br/>(Mongoose)"]
    Ctrl --> Err["central errorHandler"]
  end
  Mongo --> DB[("MongoDB")]
```

**Application lifecycle** (enforced by the API, mirrored in the console and the consumer tracker):

```mermaid
stateDiagram-v2
  [*] --> PendingVerification: consumer books
  PendingVerification --> Approved: operator verifies
  PendingVerification --> Rejected: reason required
  Approved --> LoanSanctioned: financed only (finance/admin)
  LoanSanctioned --> LoanDisbursed: finance/admin
  LoanDisbursed --> InstallationScheduled
  Approved --> InstallationScheduled: upfront only
  InstallationScheduled --> Installed
  Installed --> NetMeterCommissioned
  NetMeterCommissioned --> SubsidyClaimed
  SubsidyClaimed --> SubsidyCredited: finance/admin
  SubsidyCredited --> Completed
  Completed --> [*]
  Rejected --> [*]
```

Files waiting in *Pending Verification* show a **48-hour SLA** badge; anything older turns red in the queue health card, the lead table and the CSV export.

**Design choices**

- **Server is the source of truth.** `POST /api/applications` recomputes kW, cost, subsidy, EMI and CO₂ from the submitted units, state and loan terms, so figures from the client can't be tampered with. Every status change is re-validated (illegal move → `409`, wrong role → `403`) and written to the timeline with the operator's name.
- **One filter object, one truth.** The lead list, transactions, analytics, funnel and CSV exports all consume the same validated filter contract (`state/district/discom/scheme/status/vendor/paymentMode/from/to/search`), so a KPI and the rows underneath it always agree.
- **Analytics are aggregated, never hard-coded.** Systems live = files that reached net-meter commissioning; sanctioned ≠ disbursed; subsidy claimed ≠ credited; savings accrue from the commissioning month.
- **Same pure modules on both sides.** `solarCalculator`, `statusFlow` and `ageing` are byte-identical mirrors (a server test fails if they drift).
- **One `DataStore` interface.** Memory and Mongo implementations are interchangeable, so demo mode is not a separate code path in the controllers.
- **UI components don't make API calls.** They go through `services/*` and hooks. Admin pages are lazy-loaded.

---

## 7. API

All responses use `{ "success": true, "data": … }` or `{ "success": false, "message": "…" }`.
🔒 = `Authorization: Bearer <JWT>`. Operator routes accept **admin, agent and finance**; row-level rules apply on top.

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/health` | Status, demo mode, database mode |
| POST | `/api/auth/login` | `{email,password}` → `{token,user}` (rate-limited; consumer role denied) |
| GET | `/api/auth/me` 🔒 | Current operator |
| GET | `/api/users` 🔒 | Operators available for lead assignment |
| GET | `/api/vendors?state=&district=&search=&active=` | Vendors (sorted by distance) |
| GET | `/api/vendors/:id` | Vendor details |
| PATCH | `/api/vendors/:id/active` 🔒 | Enable/disable a vendor |
| GET | `/api/schemes?state=&level=&category=` | Subsidy catalogue (versioned, labelled demo assumptions) |
| GET | `/api/schemes/:id` | One scheme |
| POST | `/api/audits` | `{state,monthlyUnits,monthlyBill?}` → audit + recommendation |
| GET | `/api/audits/:id` | Saved audit |
| POST | `/api/applications` | Create application (figures recomputed server-side, duplicates flagged) |
| GET | `/api/applications/duplicates?phone=&consumerNumber=` | Duplicate check |
| GET | `/api/applications/:id/track` | Public, privacy-safe status for the consumer tracker |
| GET | `/api/applications` 🔒 | Paginated list (agents: unassigned + own) |
| GET | `/api/applications/export.csv` 🔒 | CSV of the filtered rows |
| GET | `/api/applications/:id` 🔒 | Full application incl. vendor, ageing, duplicates |
| PATCH | `/api/applications/:id/status` 🔒 | `{status, note?, reason?}` — state machine rules apply |
| PATCH | `/api/applications/:id/assign` 🔒 | `{userId}` / `{userId:null}` / `{assignToMe:true}` |
| GET | `/api/leads` 🔒 | Lead pipeline view (same filters, sorting, pagination) |
| GET | `/api/leads/export.csv` 🔒 | CSV incl. waiting time and SLA columns |
| PATCH | `/api/leads/:id/status` 🔒 | Approve / reject / advance |
| PATCH | `/api/leads/:id/assign` 🔒 | Assign or claim |
| GET | `/api/transactions?kind=&from=&to=&page=` 🔒 | Money ledger with totals for the filtered slice |
| POST | `/api/transactions` 🔒 | Record a transaction (admin/finance only) |
| GET | `/api/transactions/export.csv` 🔒 | CSV of the filtered ledger |
| GET | `/api/analytics/overview` 🔒 | KPIs, change %, funnel, loan branch, pipeline, money flow |
| GET | `/api/analytics/monthly` 🔒 | Monthly installations, capacity, CO₂, loans, subsidy |
| GET | `/api/analytics/regional` 🔒 | All 36 states/UTs (zeros included) |
| GET | `/api/analytics/funnel` 🔒 | Milestone funnel on its own |
| GET | `/api/analytics/money-flow` 🔒 | Money in/out by kind and by month |
| POST | `/api/demo/reset` 🔒 | Reset demo data (admin only) |

Every list/analytics/export route accepts the same filter query: `state, district, discom, scheme, status, vendor, paymentMode, assignedTo, search, from, to, preset` (comma-separated lists welcome).

---

## 8. Calculation assumptions

> **Demo Policy Assumptions — For Hackathon Simulation.** All values live in one place: `server/src/config/policyConfig.ts` (mirrored in `client/src/utils/policyConfig.ts`).

| Item | Rule |
| --- | --- |
| System size | `kW = round(monthly units ÷ 120)`, min 1, max 10 (0 units → no recommendation) |
| System cost | 1 kW ₹60,000 · 2 kW ₹1,10,000 · 3 kW ₹1,65,000 · +₹50,000 per kW above 3 |
| Central subsidy | 1 kW ₹30,000 · 2 kW ₹60,000 · ≥3 kW ₹78,000 (capped) |
| State top-up | Uttar Pradesh ₹30,000 · Gujarat ₹20,000 · Tamil Nadu ₹15,000 · other states ₹0 |
| Net cost | cost − subsidies (never below 0) |
| Monthly savings | bill × min(1, generation ÷ consumption); missing bill → units × ₹8 |
| EMI | standard reducing-balance formula; demo 7.5% p.a., 36 months |
| Affordability | EMI ÷ current bill: ≤ 0.7 Comfortable · ≤ 1 Moderate · > 1 High |
| CO₂ | annual kWh × **0.7 kg/kWh** (demo grid emission factor) |
| Trees | CO₂ kg ÷ 21 kg per tree per year (labelled as an estimate) |
| SLA | 48 hours in *Pending Verification* before a file is flagged |

> **Policy disclaimer:** Subsidy values shown are for demonstration purposes only. Actual eligibility and subsidy amounts depend on current government policies, location, DISCOM approval, and applicable scheme guidelines.
>
> **Financial disclaimer:** Illustrative financing calculation. Final loan eligibility, interest rate, tenure, subsidy eligibility, and repayment terms are subject to applicable policies and lender approval.

The app handles edge cases: 0 or very large units, a missing bill, unsupported states, loan amount 0 (upfront), invalid phone numbers, an unreachable API/MongoDB, expired JWTs (redirects to login), empty lead lists, duplicated phone/consumer numbers and out-of-order status attempts. It never shows `NaN` or `Infinity`.

---

## 9. Tests

```bash
npm test              # everything
npm --prefix server test   # 111 API + domain tests (vitest + supertest)
npm --prefix client test   # 20 unit tests (calculator, filters, status/journey)
npm run typecheck          # strict TS for both packages
```

Server coverage highlights: the 11-status state machine (illegal jumps → 409, wrong role → 403, rejection reasons mandatory), role scoping for agents and finance, filter/CSV consistency, analytics aggregation (`approved ≠ disbursed`, monotonic funnel, all-36-region output, no `NaN` anywhere), duplicate detection, ageing/SLA, scheme catalogue integrity and the byte-identical mirrors.

---

## 10. Project structure

```
.
├── package.json            # npm run dev / build / test / seed / typecheck
├── docker-compose.yml      # optional MongoDB
├── server/
│   └── src/
│       ├── config/         # env, database, policyConfig, statusFlow, subsidySchemes
│       ├── data/           # indiaRegions, historicalSeed, mockDatabase, seed
│       ├── models/         # User, Lead, Vendor, Application, Transaction, SolarAudit
│       ├── services/       # solarCalculator, statusMachine, filters, analyticsService,
│       │                   # leadQuery, duplicates, csv, auth, DataStore (memory | mongo)
│       ├── validators/     # zod schemas for every endpoint
│       ├── middleware/     # auth, validate, rateLimit, errorHandler
│       └── controllers/  routes/  utils/
│   └── tests/              # API + domain tests (vitest + supertest)
└── client/
    └── src/
        ├── pages/          # Landing, consumer/*, admin/*, auth/*
        ├── layouts/        # ConsumerLayout (phone frame), AdminLayout (sidebar)
        ├── components/     # ui/ (shadcn-style), consumer/, admin/ (FilterBar, LeadsManager,
        │                   # StatusBadge, SchemeChips, KpiCard), charts/, shared/
        ├── context/        # Language, Consumer (persisted), Auth, Demo
        ├── hooks/          # useAsync, useAnalytics, useOperatorFilters, useStatusUpdate…
        ├── services/       # thin Axios wrappers per domain
        └── utils/  types/  data/  i18n/
```

## 11. Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | API + web app with hot reload |
| `npm run build` | Production build of client (`client/dist`) and server (`server/dist`) |
| `npm test` | Server (API + domain) and client (unit) tests |
| `npm run typecheck` | Strict TypeScript for both packages |
| `npm run seed` | Seed MongoDB (idempotent) |

## 12. Tech stack

**Client:** React 18, TypeScript, Vite, React Router, Tailwind CSS, shadcn-style UI primitives (no extra UI kit), Lucide icons, Framer Motion, Recharts, React Hook Form + Zod, Axios, self-hosted Noto/Plus Jakarta fonts (renders offline).
**Server:** Node.js, Express, TypeScript, Mongoose, JWT, bcrypt, Zod, Helmet, CORS, express-rate-limit, dotenv.

---

<sub>Figures, vendors, applicants and policies in this demo are simulated for the hackathon and are not official scheme data.</sub>
