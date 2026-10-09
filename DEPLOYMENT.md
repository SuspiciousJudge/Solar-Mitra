# ☀️ SolarMitra — Going Live on AWS (Hackathon Deployment Guide)

This guide takes SolarMitra from `git clone` to a **live, public URL** on AWS.
It is written for a hackathon: fastest path first, "full AWS architecture" last.

---

## 0. What "live" means for this app

SolarMitra is **one Node.js server that serves everything**:

- The **API** (`Express`, TypeScript) at `/api/*` — port `5000` by default.
- The **website** (React SPA built by Vite into `client/dist`) — served by the same
  server, with a fallback so client-side routes (`/consumer`, `/admin/login`, …) work
  on direct links and refreshes.

So the simplest possible deployment is **a single server** running:

```bash
npm install     # installs root + server + client dependencies
npm start       # builds client & server (prestart), then serves API + website on :5000
```

- **No MongoDB is needed** in demo mode (`DEMO_MODE=true`, the default): data is a
  deterministic in-memory seed. It resets when the server restarts (or via
  **Settings → Reset demo data** in the admin console).
- Production config lives in **`server/.env`** (see §5).

> These instructions assume the repo changes in this branch: the Express server
> serves `client/dist` with an SPA fallback, the CSP allows the bill-OCR assets,
> and the root `package.json` has `start`/`prestart` scripts.

---

## 1. Prerequisites (what you actually need)

| # | Thing | Why |
| --- | --- | --- |
| 1 | **AWS account** (free tier is enough) | To host the site |
| 2 | **Node.js ≥ 18.18** on your laptop (only if you build locally) | `npm install` / `npm run build` |
| 3 | **Git** + the repo pushed to **GitHub** | Needed for App Runner / Elastic Beanstalk (Options B/C) |
| 4 | **AWS CLI** (optional, for Option C) | `aws s3 sync`, `aws cloudfront` |
| 5 | ~30–45 minutes | First-time setup |

You do **not** need: MongoDB, API keys, Docker, a domain name (a domain is optional —
every option below gives you a working public URL without one).

---

## 2. Step 0 — Verify it works locally (5 minutes)

Run these on your machine first. If this works, the cloud deployment is just
"run the same commands on a server".

```bash
git clone <your-repo-url> && cd Solar-Mitra
npm install
npm start          # builds, then serves on http://localhost:5000
```

Open and check:

| URL | Should show |
| --- | --- |
| http://localhost:5000/ | Landing page |
| http://localhost:5000/consumer | Consumer app (8-stage flow) |
| http://localhost:5000/admin/login | Operator login (`admin@solarmitra.demo` / `demo123`) |
| http://localhost:5000/api/health | `{"success":true,…,"demoMode":true}` |

Also run the test suites once: `npm test` (160 tests) and `npm run typecheck`.

---

## 3. Option A — One EC2 instance (simplest, free tier) ⭐ recommended for a hackathon

One `t3.micro` instance hosts the whole site. **Free tier: 750 hours/month for 12 months.**

### A1. Launch the instance

1. AWS Console → **EC2 → Instances → Launch instances**
2. Name: `solarmitra`
3. AMI: **Ubuntu Server 22.04 LTS**
4. Instance type: **t3.micro** (free tier eligible)
5. Key pair: create/download one (you need it to SSH in)
6. Network settings → Edit → Security group rules:
   - `SSH` (TCP 22) — Source: **My IP**
   - `Custom TCP` (TCP **5000**) — Source: **Anywhere (0.0.0.0/0)** ← the website port
7. Launch. When running, note the **Public IPv4 address**.

### A2. Install Node.js + Git

```bash
ssh -i ~/Downloads/<your-key>.pem ubuntu@<PUBLIC_IP>

# Node 22 via nvm (works on any distro)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 22

sudo apt-get update && sudo apt-get install -y git
node -v   # v22.x
```

### A3. Deploy the app

```bash
cd ~
git clone <your-repo-url> Solar-Mitra
cd Solar-Mitra
git checkout <your-branch>        # the branch with the deployment changes
npm install
npm run build                     # produces client/dist + server/dist
```

### A4. Configure production settings

```bash
cd ~/Solar-Mitra/server
cat > .env <<'EOF'
PORT=5000
DEMO_MODE=true
JWT_SECRET=<run: openssl rand -hex 32>
CLIENT_URL=http://<PUBLIC_IP>:5000
EOF
```

Notes:

- `DEMO_MODE=true` → no MongoDB needed. Data resets on restart — fine for a demo.
- `JWT_SECRET` — set a real random value so admin sessions **survive restarts**.
- Generate the secret with: `openssl rand -hex 32`
- For a real (non-demo) deployment also set `DEMO_MODE=false`, `MONGO_URI`, and
  `ADMIN_EMAIL`/`ADMIN_PASSWORD` — see §5.

### A5. Run it forever (survives SSH disconnect)

```bash
sudo npm install -g pm2
cd ~/Solar-Mitra/server
pm2 start dist/server.js --name solarmitra
pm2 save
pm2 startup          # copy-paste the command it prints, run it with sudo
```

### A6. Open the site

Go to **`http://<PUBLIC_IP>:5000`** — the website is live. 🎉

Smoke-test: `/`, `/consumer`, `/admin/login`, `/api/health` (see §2 table).

### A7. Keep the address stable (optional but recommended)

EC2 public IPs change when the instance stops/starts.
**EC2 → Network & Security → Elastic IPs → Allocate → Associate** with your instance.
(An unattached Elastic IP costs ~$0.005/hour — release it when done.)

### A8. HTTPS (recommended before judging)

Cheapest correct way: put **CloudFront** in front of the EC2 (see §6 — the same steps
work with an EC2 origin instead of S3). You get `https://<something>.cloudfront.net`
with a free certificate, and your EC2 stays on plain HTTP.

---

## 4. Option B — AWS App Runner (managed, automatic HTTPS, ~15 min)

App Runner builds from your GitHub repo and gives you an **automatic HTTPS URL**
(`https://<id>.awsapprunner.com`). Nothing to SSH into. **Not free-tier** — a
smallest-size instance costs only a few dollars per month; delete it after the event.

1. Push your branch to GitHub.
2. AWS Console → **App Runner → Create service**
3. Source: **Source code repository** → Connect to GitHub → select repo + branch
   → Deployment: **Automatic** (redeploys on every push — great for a hackathon)
4. Runtime: **Node.js** (pick version 22 if offered)
5. Build command:
   ```
   npm install --include=dev && npm run build
   ```
6. Start command:
   ```
   npm --prefix server start
   ```
   (runs `node dist/server.js` with `server/` as the working directory, so uploaded
   provider documents land in `server/var/` as intended)
7. Port: **5000** (App Runner sets the `PORT` env var to this value automatically)
8. Environment variables (Configuration → Environment variables):
   | Key | Value |
   | --- | --- |
   | `DEMO_MODE` | `true` |
   | `JWT_SECRET` | a long random string (e.g. from `openssl rand -hex 32`) |
   | `CLIENT_URL` | your App Runner URL (optional in demo mode — CORS is open) |
9. Create & deploy. Wait ~3–5 minutes for the first build.
10. Open the **Default domain** shown on the service page — that's your live HTTPS URL.

---

## 5. Production environment variables (`server/.env`)

| Variable | Default | What to set for the live demo |
| --- | --- | --- |
| `PORT` | `5000` | Keep `5000` (or `80` if you map it directly). App Runner/ALB set this for you. |
| `DEMO_MODE` | `true` | Keep `true` for the hackathon (in-memory data, no MongoDB). Set `false` + `MONGO_URI` only for a real deployment. |
| `JWT_SECRET` | ephemeral in demo mode | **Always set a random value** — otherwise admin logins die on every restart. |
| `CLIENT_URL` | `http://localhost:5173` | Your public origin(s), comma-separated. In demo mode any origin is allowed, so this is optional. |
| `MONGO_URI` | `mongodb://localhost:27017/solarmitra` | Only used when `DEMO_MODE=false` (e.g. MongoDB Atlas free tier or DocumentDB). |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | demo values | Override the seeded admin login. The demo credentials below are fine for a demo but **change them for anything real**. |

Client build-time variable (`client/.env`, only needed for the split deployment in §6):

| Variable | Default | When to change |
| --- | --- | --- |
| `VITE_API_URL` | `/api` | Keep `/api` for the single-server and CloudFront-two-origin setups. Set it to `https://<api-host>/api` only if the website and API are on different origins with no proxy. |

---

## 6. Option C — "Full AWS" architecture (S3 + CloudFront + backend) — best for judging

If the judges reward AWS-native architecture, use this. You get **one HTTPS URL**,
a free TLS certificate, and a CDN in front of everything.

```
Browser ──https──▶ CloudFront ──▶ / (S3 static website: client/dist)
                         └────────▶ /api/* (your backend: EC2 or App Runner from §3/§4)
```

### C1. Backend

Deploy the API+website with **Option A (EC2)** or **Option B (App Runner)**.
For this architecture you only need the backend reachable over HTTP(S); the website
files it serves are simply shadowed by CloudFront.

### C2. Frontend bucket

```bash
# on your laptop
npm run build:client        # creates client/dist
aws s3 mb s3://solarmitra-web --region <your-region>
aws s3 sync client/dist s3://solarmitra-web
```

AWS Console → S3 → `solarmitra-web` → **Properties → Static website hosting → Enable**,
index document `index.html`. Note the **Bucket website endpoint**
(`http://solarmitra-web.s3-website-<region>.amazonaws.com`).

### C3. CloudFront distribution

AWS Console → **CloudFront → Create distribution**:

1. **Origin 1** (website): *Custom origin* → the S3 website endpoint from C2
   (HTTP only, origin path empty).
2. **Origin 2** (API): *Custom origin* → your backend's public origin,
   e.g. `http://<EC2-IP>:5000` or `<id>.awsapprunner.com` (HTTP is fine —
   CloudFront↔origin can stay HTTP; viewers still get HTTPS).
3. **Behaviors**:
   - Default (`*`) → Origin 1 (S3)
   - Add behavior: Path pattern **`/api/*`** → Origin 2 (backend).
     Important: CloudFront forwards the full path (`/api/...`) to the origin — the
     Express server expects exactly that. ✅
4. Viewer protocol policy: **HTTPS only** (or "Redirect HTTP to HTTPS").
5. Create distribution (takes ~2–5 min to deploy). Note the
   **Distribution domain name** (`https://dxxxxxxxxxxxx.cloudfront.net`).

Test: `https://<distribution>/` (website), `https://<distribution>/api/health` (API),
`https://<distribution>/consumer` (SPA route).

> Alternative to the two-origin setup: build the client with
> `VITE_API_URL=https://<backend-host>/api npm run build:client` and host it anywhere.
> The two-origin CloudFront setup above is preferred — it keeps everything same-origin.

### C4. Custom domain (optional)

1. **ACM** (us-east-1 — required for CloudFront) → Request a public certificate for
   your domain → validate via DNS.
2. CloudFront → your distribution → Edit → **Alternate domain name (CNAME)** → add the
   domain → select the ACM certificate.
3. **Route 53** (or your DNS provider) → create an **A record (Alias)** pointing the
   domain at the CloudFront distribution.

---

## 7. Hackathon demo cheat-sheet

| What | Value |
| --- | --- |
| Admin login | `admin@solarmitra.demo` / `demo123` |
| Agent login | `agent@solarmitra.demo` / `agent123` |
| Finance login | `finance@solarmitra.demo` / `finance123` |
| Provider logins | `provider.new@` / `provider.pending@` / `provider.approved@solarmitra.demo` — all `demo123` |
| Consumer phone OTP | `123456` |
| Reset everything | Admin console → **Settings → Reset demo data** |

- The consumer flow is **mobile-first** — on desktop it renders inside a phone frame.
- Bill OCR runs **in the browser** (tesseract.js) and pulls its engine data from
  `cdn.jsdelivr.net` — the demo device needs internet access for OCR.
- In demo mode, **all data resets when the server restarts**. If you restart the
  server right before judging, that's fine — the seed rebuilds identically.
- The admin header shows a subtle **Demo Mode** badge — expected.

---

## 8. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `http://<ip>:5000` won't open | Security group missing TCP 5000 | Add inbound rule `Custom TCP 5000` from `0.0.0.0/0` |
| `/consumer` or `/admin/login` shows 404 on direct open | SPA fallback missing (old build) | `npm run build` and restart — this branch serves `client/dist` with a fallback |
| Website loads but API calls fail | CSP/CORS | Check browser console; `/api/health` must return 200; in demo mode CORS is open |
| Bill OCR stuck/fails | No internet on the device, or CSP blocking jsDelivr | Check console for CSP errors; the CSP in this branch allows `cdn.jsdelivr.net` |
| Admin login works, then "session expired" after a restart | `JWT_SECRET` not set | Set `JWT_SECRET` in `server/.env` to a fixed random string |
| Data "disappeared" | Demo mode resets on restart | Expected — use **Settings → Reset demo data**, or switch to `DEMO_MODE=false` + MongoDB |
| Uploads (provider documents) fail or vanish | Server started from the wrong directory | Start it with `server/` as the working directory (`npm --prefix server start`) so files land in `server/var/` |
| White screen | Assets didn't build | `npm run build` must succeed; check `client/dist` exists on the server |

---

## 9. Cost & cleanup (don't get a surprise bill)

- **EC2 `t3.micro`**: 750 h/month free for 12 months (AWS free tier). Stop the instance
  when not demoing (stopped instances cost nothing, but the **Elastic IP costs
  ~$0.005/hour while unattached** — release it if you don't need a stable IP).
- **App Runner**: not free-tier — roughly a few dollars/month for the smallest
  instance. **Delete the service** after the hackathon.
- **S3 + CloudFront**: CloudFront has a free tier (1 TB transfer/month); S3 storage for
  this site is a few MB. Delete the bucket + distribution after the event.
- **MongoDB Atlas** (only if you switch off demo mode): the M0 free tier exists.
- After the event: EC2 → terminate instance, release Elastic IP, App Runner → delete
  service, S3 → empty + delete bucket, CloudFront → disable + delete distribution.

---

## 10. What changed in this branch to make deployment possible

1. **`server/src/app.ts`** — the Express server now serves the built SPA
   (`client/dist`) with a fallback for client-side routes, so **one server hosts
   API + website**. `/api/*` keeps priority and keeps its JSON 404s.
2. **`server/src/app.ts` (CSP)** — helmet's Content-Security-Policy now allows what
   the SPA needs at runtime: the tesseract.js OCR worker/WASM/language data from
   `cdn.jsdelivr.net` (`connect-src`), blob workers (`worker-src`), WebAssembly
   (`'wasm-unsafe-eval'`). `upgrade-insecure-requests` was removed so plain-HTTP
   single-box deployments work (use HTTPS in front for real traffic).
3. **`package.json`** — added `prestart` (build) + `start` (`npm --prefix server
   start`, so the working directory is `server/` and provider-document uploads land
   in the git-ignored `server/var/`). `npm start` now means "build and serve".

Everything is verified: `npm test` (160 tests), `npm run typecheck`, `npm run build`,
and a production smoke test of `/`, `/consumer`, `/admin/login`, `/provider/login`,
`/api/health`, static assets, and the login endpoint.
