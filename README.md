# ☀️ SolarMitra — *Your Solar Friend*

> **SANKALP by Satin Finserv — The Climate Edition** · Theme: *Sustainable Cities & Rural Energy Transition*

**Tagline:** *Your roof can power your future.*

SolarMitra helps households find out whether rooftop solar makes sense for them, understand the subsidies they may get, compare paying upfront with a Satin Finserv green loan, and book a verified installer. All of it happens in one mobile-first, multilingual flow. Operators get a dashboard to verify leads and track climate impact across the portfolio.

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

A single flow that goes from **electricity bill → solar plan → subsidy → affordable EMI → verified installer → tracked application**:

1. **Pick a language**: English, हिंदी, ગુજરાતી, தமிழ் (saved on the device)
2. **Upload a bill**: simulated OCR fills in state, units and bill amount, and every value stays editable
3. **See the plan**: recommended kW, system cost, central and state subsidy, net cost, monthly savings
4. **Choose how to pay**: upfront, or a Satin Finserv EMI compared side by side with today's bill, plus an EMI simulator
5. **Pick a partner**: nearby MNRE-empanelled, verified installers
6. **Book & apply**: get an application ID (`SM-2026-XXXX`) and a live status tracker

**Operators** (lender / field agents) get a *Clean Energy Transition Dashboard* with KPIs, charts, lead verification (approve/reject), vendor management and a climate-impact view.

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

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@solarmitra.demo` | `demo123` |

The login page also has a **"Use demo credentials"** button. The consumer `/login` page simulates phone OTP; use **`123456`**.

> These credentials only exist in the seeded demo data. Change or remove them before any real deployment.

---

## 4. Demo mode vs MongoDB

| `DEMO_MODE` | Behaviour |
| --- | --- |
| `true` *(default)* | Seeded in-memory data (3 Kanpur vendors, 10 leads across UP/GJ/TN/RJ/MH, analytics). Nothing to install. The admin header shows a subtle **Demo Mode** badge. Data resets when the server restarts or from **Settings → Reset demo data**. |
| `false` | Uses MongoDB via Mongoose. If MongoDB can't be reached, the API logs the reason and **falls back to demo data** so a live demo never breaks (`/api/health` then reports `database: "fallback-demo"`). |

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
| `JWT_SECRET` | `change_this_secret` | **Required** when `DEMO_MODE=false`. In demo mode an ephemeral secret is generated if it's unset (admin sessions then end when the server restarts). |
| `DEMO_MODE` | `true` | See above |
| `CLIENT_URL` | `http://localhost:5173` | CORS allow-list (comma separated) |

**`client/.env`** (copy from `client/.env.example`, optional)

| Variable | Default | Notes |
| --- | --- | --- |
| `VITE_API_URL` | `/api` | `/api` goes through the Vite dev proxy to `:5000` (works on localhost, LAN phones and tunnels). You can also set `http://localhost:5000/api`. |
| `VITE_DEMO_MODE` | `true` | If the API is unreachable, the consumer flow keeps working with bundled demo vendors and a local application ID |

No secrets are committed. `.env` files are git-ignored.

---

## 5. Five-minute demo script

1. **Landing** → *Start My Solar Audit*
2. **Language** → choose **हिंदी** (the whole consumer flow switches; you can change it any time from the top bar)
3. **Onboarding** → 3 short steps (Next / Back / Skip)
4. **Audit** → *Upload bill* → the simulated OCR reads **Uttar Pradesh · 350 kWh · ₹2,800** (labelled *Demo OCR Data*)
5. **Subsidy** → **3 kW** · ₹1,65,000 − ₹78,000 central − ₹30,000 state = **₹57,000** · saves ~₹2,800/month
6. **Financing** → toggle *Upfront* / *Satin Finserv EMI* → **₹57,000 @ 7.5% × 36 months ≈ ₹1,773/month** (calculated, not hard-coded). The chart compares ₹2,800 today, ~₹1,773 EMI and ₹0 after the loan, a monthly difference of ~₹1,030. Try the EMI simulator sliders.
7. **Vendors** → 3 verified partners near Kanpur → *View details* → *Select* → fill in name/phone → **Book Installation & Apply for Loan**
8. **Success** → confetti, application ID, timeline → *Track My Application*
9. **Operator console** → `/admin/login` → *Use demo credentials*
10. **Dashboard**: September 2026, **1,240 households · 3.2 MW · 4,500 t CO₂ · ₹8.5 Cr** plus 4 charts and the impact story
11. **Leads** → your new application is at the top with a **New** badge → **Approve**. The KPIs on the dashboard go up (1,240 → 1,241) and the consumer's tracker shows *Approved*.
12. **Settings → Reset demo data** restores everything for the next run.

---

## 6. Architecture

```mermaid
flowchart LR
  subgraph Client["client/ — React + TS + Vite"]
    Pages["Pages<br/>(consumer, admin, auth)"] --> Ctx["Contexts<br/>Language · Consumer · Auth · Demo"]
    Pages --> Hooks["Hooks<br/>useAsync · useAnalytics · useStatusUpdate"]
    Hooks --> Svc["services/*<br/>(Axios)"]
    Pages --> Calc1["utils/solarCalculator"]
  end
  Svc -- "/api (Vite proxy)" --> API
  subgraph Server["server/ — Express + TS"]
    API["routes"] --> MW["helmet · cors · rate-limit<br/>zod validate · JWT auth"]
    MW --> Ctrl["controllers"]
    Ctrl --> Calc2["services/solarCalculator<br/>(server recomputes all figures)"]
    Ctrl --> Store{"DataStore"}
    Store -->|DEMO_MODE=true| Mem["memoryStore<br/>(mockDatabase seed)"]
    Store -->|DEMO_MODE=false| Mongo["mongoStore<br/>(Mongoose)"]
    Ctrl --> Err["central errorHandler"]
  end
  Mongo --> DB[("MongoDB")]
```

**Application lifecycle**

```mermaid
stateDiagram-v2
  [*] --> PendingVerification: consumer books
  PendingVerification --> Approved: operator approves
  PendingVerification --> Rejected: operator rejects
  Approved --> InstallationScheduled
  InstallationScheduled --> Completed
  Completed --> [*]
```

**Design choices**

- **Server is the source of truth.** On `POST /api/applications` the API recomputes kW, cost, subsidy, EMI and CO₂ from the submitted units, state and loan terms, so figures from the client can't be tampered with.
- **Same calculator on both sides.** `solarCalculator.ts` runs in the client (instant UI) and the server (validation), with the same tests.
- **One `DataStore` interface.** Memory and Mongo implementations are interchangeable, so demo mode is not a separate code path in the controllers.
- **UI components don't make API calls.** They go through `services/*` and hooks. Admin pages are lazy-loaded.

---

## 7. API

All responses use `{ "success": true, "data": … }` or `{ "success": false, "message": "…" }`.
🔒 = requires `Authorization: Bearer <JWT>` (admin/agent).

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/health` | Status, demo mode, database mode |
| POST | `/api/auth/login` | `{email,password}` → `{token,user}` (rate-limited) |
| GET | `/api/auth/me` 🔒 | Current operator |
| GET | `/api/vendors?state=&search=&active=` | Vendors (sorted by distance) |
| GET | `/api/vendors/:id` | Vendor details |
| PATCH | `/api/vendors/:id/active` 🔒 | Enable/disable a vendor |
| POST | `/api/audits` | `{state,monthlyUnits,monthlyBill?}` → audit, recommendation, climate impact |
| GET | `/api/audits/:id` | Saved audit |
| POST | `/api/applications` | Create application (figures recomputed server-side) |
| GET | `/api/applications/:id/track` | Public, privacy-safe status for the consumer tracker |
| GET | `/api/applications` 🔒 | Paginated list (`search,state,status,sort,order,page,limit`) |
| GET | `/api/applications/:id` 🔒 | Full application incl. vendor |
| PATCH | `/api/applications/:id/status` 🔒 | `{status, note?}` |
| GET | `/api/leads` 🔒 | Lead view of applications (same filters) |
| PATCH | `/api/leads/:id/status` 🔒 | Approve / reject / advance |
| GET | `/api/analytics/overview` 🔒 | KPIs, change %, pipeline, trees estimate, methodology |
| GET | `/api/analytics/monthly` 🔒 | Jan–Sep installations, CO₂, loans |
| GET | `/api/analytics/regional` 🔒 | 5-state breakdown |
| POST | `/api/demo/reset` 🔒 | Reset demo data (admin) |

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

> **Policy disclaimer:** Subsidy values shown are for demonstration purposes only. Actual eligibility and subsidy amounts depend on current government policies, location, DISCOM approval, and applicable scheme guidelines.
>
> **Financial disclaimer:** Illustrative financing calculation. Final loan eligibility, interest rate, tenure, subsidy eligibility, and repayment terms are subject to applicable policies and lender approval.

The app handles edge cases: 0 or very large units, a missing bill, unsupported states, loan amount 0 (upfront), invalid phone numbers, an unreachable API/MongoDB, expired JWTs (redirects to login) and empty lead lists. It never shows `NaN` or `Infinity`.

---

## 9. Project structure

```
.
├── package.json            # npm run dev / build / test / seed / typecheck
├── docker-compose.yml      # optional MongoDB
├── server/
│   └── src/
│       ├── config/         # env, database, policyConfig
│       ├── data/           # mockDatabase (seed data), seed.ts
│       ├── models/         # User, Lead, Vendor, Application, Loan, SolarAudit
│       ├── services/       # solarCalculator, analytics, auth, DataStore (memory | mongo)
│       ├── validators/     # zod schemas
│       ├── middleware/     # auth, validate, rateLimit, errorHandler
│       └── controllers/  routes/  utils/
│   └── tests/              # calculator + API tests (vitest + supertest)
└── client/
    └── src/
        ├── pages/          # Landing, consumer/*, admin/*, auth/*
        ├── layouts/        # ConsumerLayout (phone frame), AdminLayout (sidebar)
        ├── components/     # ui/ (shadcn-style), consumer/, admin/, charts/, shared/
        ├── context/        # Language, Consumer (persisted), Auth, Demo
        ├── hooks/  services/  utils/  types/  data/
        └── i18n/           # translations: en · hi · gu · ta
```

## 10. Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | API + web app with hot reload |
| `npm run build` | Production build of client (`client/dist`) and server (`server/dist`) |
| `npm test` | Server (calculator + API validation) and client (calculator) tests |
| `npm run typecheck` | Strict TypeScript for both packages |
| `npm run seed` | Seed MongoDB (idempotent) |

## 11. Tech stack

**Client:** React 18, TypeScript, Vite, React Router, Tailwind CSS, shadcn-style UI primitives (no extra UI kit), Lucide icons, Framer Motion, Recharts, React Hook Form + Zod, Axios, self-hosted Noto/Plus Jakarta fonts (renders offline).
**Server:** Node.js, Express, TypeScript, Mongoose, JWT, bcrypt, Zod, Helmet, CORS, express-rate-limit, dotenv.

---

<sub>Figures, vendors, applicants and policies in this demo are simulated for the hackathon and are not official scheme data.</sub>
