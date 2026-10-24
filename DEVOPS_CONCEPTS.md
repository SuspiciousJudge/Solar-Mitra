# DevOps Concepts — SolarMitra

> A complete, project-grounded theory reference. Every concept here maps directly to code that exists in this repository — `Dockerfile`, `docker-compose.yml`, and `.github/workflows/ci-cd.yml`. The deployment job in the pipeline is written and wired up but has **not yet been run** against a live cloud environment.

---

## Table of Contents

1. [What is DevOps?](#1-what-is-devops)
2. [Continuous Integration (CI)](#2-continuous-integration-ci)
3. [GitHub Actions — the Engine](#3-github-actions--the-engine)
4. [Anatomy of `ci-cd.yml` — Line by Line](#4-anatomy-of-ci-cdyml--line-by-line)
5. [Docker — Containerisation from First Principles](#5-docker--containerisation-from-first-principles)
6. [Multi-Stage Builds — Why and How](#6-multi-stage-builds--why-and-how)
7. [The SolarMitra Dockerfile — Stage by Stage](#7-the-solarmitra-dockerfile--stage-by-stage)
8. [Docker Compose — Local Orchestration](#8-docker-compose--local-orchestration)
9. [The SolarMitra docker-compose.yml — Line by Line](#9-the-solarmitra-docker-composeyml--line-by-line)
10. [GitHub Container Registry (GHCR)](#10-github-container-registry-ghcr)
11. [Image Tagging and Digests](#11-image-tagging-and-digests)
12. [Docker Layer Caching](#12-docker-layer-caching)
13. [Security Practices in the Dockerfile](#13-security-practices-in-the-dockerfile)
14. [Secrets Management in CI](#14-secrets-management-in-ci)
15. [Health Checks](#15-health-checks)
16. [How All the Pieces Connect](#16-how-all-the-pieces-connect)

---

## 1. What is DevOps?

**DevOps** is a culture, a set of practices, and a toolchain that unifies **software development** (writing code) with **IT operations** (running and maintaining that code in production). The name is a portmanteau of *Dev* and *Ops*.

Before DevOps, these two teams were siloed. Developers would hand over code; operations would try to run it. The result was slow, error-prone releases and the infamous "it works on my machine" problem.

DevOps solves this by making the delivery of software a **repeatable, automated, and auditable process**.

### Core Principles

| Principle | What it means in practice |
|-----------|--------------------------|
| **Automate everything** | Build, test, and deploy via scripts, not manual steps |
| **Fail fast** | Catch bugs immediately when code is written, not weeks later |
| **Infrastructure as Code** | Your `Dockerfile` and `docker-compose.yml` *are* infrastructure — they live in git |
| **Immutable artifacts** | Build once, deploy the same binary everywhere — never patch in production |
| **Short feedback loops** | Minutes from commit to test result, not days |

### What SolarMitra actually does

1. Every Pull Request automatically runs tests, typechecks, and a build check.
2. Every merge to `main` additionally builds a Docker image and pushes it to a registry.
3. The pipeline is written to deploy that image to Google Cloud Run — that step is ready but not yet activated.

---

## 2. Continuous Integration (CI)

### The Theory

**Continuous Integration** is the practice of integrating code changes into a shared branch **frequently** — ideally multiple times a day — and verifying each integration with an **automated build and test sequence**.

The word "continuous" is the key. Without CI, developers work in isolation for days or weeks, then try to merge everything at once. This is called a **merge hell** or **integration hell** — huge conflicts, mysterious bugs, and expensive debugging.

With CI, every commit is a small integration. Conflicts are small and caught immediately. Bugs are isolated to the last few lines of code changed.

### What a CI pipeline actually does

```
1. Trigger     → something happened (a PR was opened, a push was made)
2. Provision   → a fresh machine is spun up
3. Checkout    → source code is downloaded to that machine
4. Install     → dependencies are installed
5. Validate    → type check, lint (static analysis without running code)
6. Test        → unit tests, integration tests are executed
7. Build       → the production artifact is compiled (proves it builds cleanly)
8. Report      → pass / fail is reported back to GitHub as a commit status
```

If any step fails, the pipeline stops and the failure is reported. A PR cannot be merged until the pipeline passes.

### SolarMitra's CI job

The `ci` job in `ci-cd.yml` does exactly these steps:

```
Install Node.js 22
→ npm ci                         (install all dependencies)
→ npm run typecheck              (TypeScript strict check for server + client)
→ npm --prefix server test       (server: vitest + supertest)
→ npm --prefix client test       (client: vitest)
→ npm run build                  (Vite build + tsc compile — proves production build works)
```

A developer opening a PR against `main` cannot merge until all six of these pass.

### `npm ci` vs `npm install`

The pipeline uses `npm ci`, not `npm install`. The difference matters:

| `npm install` | `npm ci` |
|--------------|---------|
| Updates `package-lock.json` | Never modifies `package-lock.json` |
| Installs a range of versions | Installs the exact locked versions |
| Slower (resolves versions each time) | Faster (reads lock file directly) |
| For development | For CI, Docker, and reproducible environments |

In CI you need **deterministic** builds. `npm ci` guarantees that the same versions are installed every single time, making builds reproducible across machines and over time.

---

## 3. GitHub Actions — the Engine

### What it is

GitHub Actions is a **workflow automation platform** built directly into GitHub. You describe what should happen as YAML files inside `.github/workflows/`. GitHub runs them on managed Linux or Windows VMs called **runners** when specific events occur.

You do not need to set up a separate CI server (like Jenkins or CircleCI). The runner, the compute, and the secrets storage are all provided by GitHub.

### Core Vocabulary

#### Workflow
A YAML file inside `.github/workflows/`. It is the top-level unit of automation. SolarMitra has exactly one: `ci-cd.yml`.

#### Event (Trigger)
The `on:` block at the top of a workflow defines what causes it to run. SolarMitra:

```yaml
on:
  pull_request:
    branches: [main]   # any PR whose target is main
  push:
    branches: [main]   # any push (including merges) directly to main
```

Two events, same workflow. The difference in behaviour between them is handled inside with `if:` conditions.

#### Job
A workflow contains one or more **jobs**. Each job runs on its own fresh runner VM — it has no shared filesystem or state with other jobs. Jobs can run in parallel (default) or sequentially (`needs:`).

SolarMitra has three jobs:

```
ci      → always runs on PR and push
docker  → runs only on push to main, only after ci passes
deploy  → runs only on push to main, only after docker passes (not yet activated)
```

#### Step
A job is a list of **steps** executed in order on the same runner. A step is either a shell command (`run:`) or a reusable **Action** (`uses:`).

```yaml
steps:
  - name: Checkout repository
    uses: actions/checkout@v4      # a marketplace Action

  - name: Run server tests
    run: npm --prefix server test  # a raw shell command
    env:
      NODE_ENV: test
```

#### Action
An Action is a pre-packaged, reusable unit of automation published on the GitHub Marketplace. Instead of writing 30 lines to authenticate to Docker Hub, you write one `uses:` line. Actions are versioned (e.g. `@v4`) so you pin to a known-good version.

#### Runner
The virtual machine that executes a job. `runs-on: ubuntu-latest` gives you a fresh Ubuntu 22.04 VM with Node, Python, Docker, and hundreds of tools pre-installed. The machine is destroyed when the job ends. Every job starts from a clean state.

#### Permissions
The `permissions:` block restricts what the automatically-created `GITHUB_TOKEN` can do during the workflow:

```yaml
permissions:
  contents: read    # can read the repository
  packages: write   # can push images to GitHub Container Registry
```

Least-privilege: only grant what is needed.

#### Expression Syntax `${{ }}`
GitHub Actions has its own expression language used inside YAML values:

```yaml
image: ghcr.io/${{ github.repository_owner }}/solarmitra
```

`github.repository_owner` is a **context** — a built-in object provided by GitHub containing information about the current run.

Common contexts:
- `github.repository_owner` — the GitHub username or org
- `github.ref` — the git ref that triggered the run (`refs/heads/main`)
- `github.actor` — the person or bot that triggered the run
- `github.event_name` — `push` or `pull_request`
- `secrets.NAME` — an encrypted secret stored in repo settings
- `env.NAME` — a workflow-level environment variable
- `needs.JOB.outputs.KEY` — an output from an upstream job

#### `needs:` — sequential jobs

```yaml
docker:
  needs: ci         # docker job only starts if ci job succeeded

deploy:
  needs: docker     # deploy job only starts if docker job succeeded
```

Without `needs:`, all jobs run simultaneously. With `needs:`, you build a directed acyclic graph (DAG) of job dependencies. If `ci` fails, neither `docker` nor `deploy` starts.

#### `if:` — conditional jobs

```yaml
if: github.ref == 'refs/heads/main' && github.event_name == 'push'
```

This condition is on both the `docker` and `deploy` jobs. It prevents Docker image builds from triggering on PRs (which would be slow and wasteful). Only actual merges to `main` go all the way through the pipeline.

#### `timeout-minutes:`

```yaml
timeout-minutes: 15   # ci job
timeout-minutes: 20   # docker job
```

If a job hangs (a test gets stuck, a network call never returns), it will be killed after this many minutes. Without this, a hung job would consume runner minutes indefinitely.

#### `outputs:` — passing data between jobs

Jobs cannot share files or memory, but they can pass simple string values through **outputs**:

```yaml
# docker job declares an output
outputs:
  image_digest: ${{ steps.build.outputs.digest }}

# deploy job reads it via needs.docker.outputs.image_digest
image: ${{ env.IMAGE_NAME }}@${{ needs.docker.outputs.image_digest }}
```

This is the mechanism by which the exact image digest built in the `docker` job is forwarded to the `deploy` job. It ensures the deploy never accidentally uses a different image.

#### `environment:`

```yaml
environment:
  name: production
  url: ${{ steps.deploy.outputs.url }}
```

GitHub Environments are named deployment targets with their own protection rules (required reviewers, wait timers). Assigning a job to an environment means the deployment shows up in GitHub's deployment history with a URL.

---

## 4. Anatomy of `ci-cd.yml` — Line by Line

### Top-level declarations

```yaml
name: CI/CD
```
The workflow name shown in GitHub's Actions tab.

```yaml
env:
  IMAGE_NAME: ghcr.io/${{ github.repository_owner }}/solarmitra
  NODE_VERSION: "22"
```
Workflow-level environment variables available to all jobs. `IMAGE_NAME` builds the full registry path dynamically from the repo owner, so if someone forks the repo the image name still points to their own registry.

---

### Job 1 — `ci`

```yaml
ci:
  name: Test · Typecheck · Build
  runs-on: ubuntu-latest
  timeout-minutes: 15
```
Runs on every PR and every push. Killed if it takes more than 15 minutes.

**Step: Checkout**
```yaml
- uses: actions/checkout@v4
```
Clones the repository into the runner's working directory. Without this, the runner has no source code. `@v4` is the pinned version.

**Step: Set up Node.js**
```yaml
- uses: actions/setup-node@v4
  with:
    node-version: ${{ env.NODE_VERSION }}   # "22"
    cache: "npm"
```
Installs the exact Node.js version (22) and configures npm's dependency cache. `cache: "npm"` tells GitHub to store and restore `~/.npm` between runs, so `npm ci` skips downloading already-cached packages.

**Step: Install dependencies**
```yaml
- run: npm ci
```
Installs root + (via `postinstall` in `package.json`) server and client dependencies. The root `package.json` has:
```json
"postinstall": "npm --prefix server install --ignore-scripts && npm --prefix client install --ignore-scripts"
```
So `npm ci` at the root installs all three workspaces in one command.

**Step: Typecheck**
```yaml
- run: npm run typecheck
```
This runs `tsc --noEmit` for both server and client (defined in root `package.json`). `--noEmit` means TypeScript checks types strictly without producing any output files — it's a pure validation pass. This catches:
- Wrong argument types
- Missing properties
- Null/undefined access errors
- Import mismatches

**Step: Server tests**
```yaml
- run: npm --prefix server test
  env:
    NODE_ENV: test
    DEMO_MODE: "true"
    JWT_SECRET: "ci_only_secret_not_for_production"
```
Runs Vitest in the `server/` package. `DEMO_MODE=true` prevents the server from trying to connect to MongoDB during tests (uses in-memory data instead). The `JWT_SECRET` is a throwaway value just for CI — it is not a real secret.

**Step: Client tests**
```yaml
- run: npm --prefix client test
  env:
    NODE_ENV: test
```
Runs Vitest in the `client/` package.

**Step: Build**
```yaml
- run: npm run build
  env:
    VITE_API_URL: /api
    VITE_DEMO_MODE: "true"
```
Runs `build:client` (Vite) then `build:server` (tsc) as defined in root `package.json`. If the build fails, the pipeline fails — even if tests passed. This catches configuration errors that tests don't cover (e.g., a missing environment variable the build depends on). `VITE_API_URL=/api` is a Vite build-time variable that tells the React app to make API calls to the same origin (relative URL), which is correct for production where Express serves both the API and the SPA.

---

### Job 2 — `docker`

```yaml
docker:
  needs: ci
  if: github.ref == 'refs/heads/main' && github.event_name == 'push'
  timeout-minutes: 20
```
Only runs if: (1) the `ci` job passed, AND (2) this is a push directly to `main` (not a PR).

**Step: Set up Docker Buildx**
```yaml
- uses: docker/setup-buildx-action@v3
```
Installs **BuildKit** — Docker's advanced build engine. BuildKit enables:
- Multi-stage build optimisations
- Parallel stage execution
- The `type=gha` cache backend (GitHub Actions cache)
- Better layer caching

Without this step, you get the old Docker build engine which is slower and less featureful.

**Step: Login to GHCR**
```yaml
- uses: docker/login-action@v3
  with:
    registry: ghcr.io
    username: ${{ github.actor }}
    password: ${{ secrets.GITHUB_TOKEN }}
```
Authenticates the Docker CLI to push images to GitHub Container Registry. `GITHUB_TOKEN` is automatically generated by GitHub for each workflow run — no manual setup needed. The `packages: write` permission in the workflow's `permissions:` block is what allows this token to push.

**Step: Extract metadata (tags and labels)**
```yaml
- id: meta
  uses: docker/metadata-action@v5
  with:
    images: ${{ env.IMAGE_NAME }}
    tags: |
      type=sha,prefix=sha-
      type=raw,value=latest,enable={{is_default_branch}}
      type=ref,event=branch
```
This Action generates Docker image tags automatically from git metadata. The `id: meta` means later steps can reference its outputs as `steps.meta.outputs.tags`.

Three tags are generated:
- `sha-a1b2c3d` — short commit SHA. Immutable, points to exactly this commit.
- `latest` — always points to the newest main branch build.
- `main` — named after the branch.

**Step: Build and push**
```yaml
- id: build
  uses: docker/build-push-action@v6
  with:
    context: .
    file: Dockerfile
    push: true
    tags: ${{ steps.meta.outputs.tags }}
    labels: ${{ steps.meta.outputs.labels }}
    cache-from: type=gha
    cache-to: type=gha,mode=max
    build-args: |
      VITE_API_URL=/api
      VITE_DEMO_MODE=true
```

- `context: .` — the build context is the entire repository root (the `.` means "here")
- `file: Dockerfile` — use our Dockerfile
- `push: true` — actually push the image (would be `false` for a build-only check)
- `tags:` — the tags generated in the previous step
- `cache-from/cache-to: type=gha` — use GitHub Actions' cache storage for Docker layer cache
- `mode=max` — cache all intermediate layers (not just the final image)
- `build-args:` — these are passed into the Dockerfile as `ARG` values and baked into the React build

The `id: build` means the step exposes `steps.build.outputs.digest` — the full `sha256:...` hash of the image just pushed. This is forwarded to the deploy job via `outputs:`.

---

## 5. Docker — Containerisation from First Principles

### The Problem Docker Solves

Before containers, deploying a Node.js application meant:
- Installing the right Node version on the server
- Installing all system libraries the app needed
- Making sure environment variables were configured
- Hoping the server OS matched your development OS

This was fragile. "It works on my machine" is the canonical symptom. Different Node versions, different glibc versions, different paths — any mismatch could break the app silently.

### What a Container Is

A **container** is a **process** that is isolated from the rest of the system using Linux kernel features:

- **Namespaces** — each container has its own view of the filesystem, network, process tree, and hostnames. Container process 1 cannot see processes outside its namespace.
- **Cgroups** (Control Groups) — limits how much CPU, memory, and I/O a container can use.
- **Union filesystems** — the container's filesystem is built from layered read-only image layers plus a thin writable layer on top.

A container is **not** a virtual machine. VMs virtualise hardware and run a full OS kernel. Containers share the host kernel — they are just processes with extra isolation. This makes containers extremely lightweight (start in milliseconds, use megabytes of RAM).

### What a Docker Image Is

A Docker **image** is the blueprint from which containers are created. It is an ordered stack of **layers**, each layer being a diff of filesystem changes.

```
Layer 5: your compiled application code (changes every commit)
Layer 4: npm install (changes when dependencies change)
Layer 3: copy package.json (changes when you add/remove a package)
Layer 2: node:22-alpine base (rarely changes)
Layer 1: scratch / base alpine (almost never changes)
```

Each layer is identified by a cryptographic hash (SHA256). Docker caches layers. If layer 3 hasn't changed, layers 1–3 are served from cache and Docker only re-runs layers 4 and 5.

### Images vs Containers (the Class/Object analogy)

| Docker term | OOP analogy |
|------------|-------------|
| Image | Class definition |
| Container | Instance (object) of that class |
| `docker build` | Compiling the class |
| `docker run` | Instantiating an object |

You can run multiple containers from the same image simultaneously.

### Key Docker commands

```bash
docker build -t solarmitra .         # build image from Dockerfile, tag it "solarmitra"
docker run -p 5000:5000 solarmitra   # run a container from that image
docker images                         # list images on your machine
docker ps                             # list running containers
docker logs solarmitra-app           # see container stdout/stderr
docker exec -it solarmitra-app sh    # open a shell inside a running container
```

---

## 6. Multi-Stage Builds — Why and How

### The Problem with a Naive Dockerfile

If you write a simple Dockerfile like this:

```dockerfile
FROM node:22
WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build
CMD ["node", "server/dist/server.js"]
```

Your production image contains:
- TypeScript source files (`.ts`) — not needed at runtime
- TypeScript compiler, Vite, ESLint, test frameworks — dev tools that inflate the image
- All development `node_modules` — potentially hundreds of MB
- Possibly build secrets that were set as environment variables

A typical naive Node.js image for a project like SolarMitra could be **1–2 GB**.

### What Multi-Stage Builds Do

Multi-stage builds let you use **multiple `FROM` instructions** in a single Dockerfile. Each `FROM` starts a new build stage with its own isolated filesystem. You selectively copy files **between stages** using `COPY --from=<stage>`.

Docker discards all intermediate stages. Only the **final stage** becomes the image you use. All the build tools and intermediate files from earlier stages are gone — they never enter your final image.

```
Stage 1 (deps)         → install ALL dependencies (dev + prod)
Stage 2 (build-client) → compile React with Vite     → produces client/dist/
Stage 3 (build-server) → compile TypeScript with tsc  → produces server/dist/
Stage 4 (runtime)      → start fresh, copy only:
                            - compiled client/dist/
                            - compiled server/dist/
                            - production server node_modules only
```

The `runtime` stage does **not** have TypeScript, Vite, Vitest, or dev dependencies. It cannot even run `tsc`.

### Why `node:22-alpine`?

Every stage uses `node:22-alpine` as its base:
- `node:22` (full Debian) is ~1 GB
- `node:22-alpine` (based on Alpine Linux) is ~60 MB

Alpine Linux is a security-focused minimal Linux distribution. Fewer installed packages means fewer potential vulnerabilities (CVEs). The tradeoff is that Alpine uses `musl` libc instead of `glibc`, which occasionally causes issues with native addons — but for a pure Node.js app like SolarMitra this is not a concern.

### Size comparison

| Image type | Approximate size |
|-----------|-----------------|
| Naive single-stage with all deps | ~1.5 GB |
| SolarMitra 4-stage build | ~200–300 MB |

### Parallel stage execution with BuildKit

BuildKit (enabled by `docker/setup-buildx-action@v3`) can execute independent stages in parallel. `build-client` and `build-server` both only depend on `deps` — BuildKit runs them at the same time, reducing total build time.

---

## 7. The SolarMitra Dockerfile — Stage by Stage

### Stage 1 — `deps`

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
```

`AS deps` gives this stage the name `deps` so later stages can reference it in `COPY --from=deps`.

`WORKDIR /app` creates the directory `/app` inside the container and sets it as the working directory for all subsequent commands. Like `cd /app && mkdir -p /app`.

```dockerfile
COPY package.json package-lock.json ./
COPY server/package.json server/package-lock.json ./server/
COPY client/package.json client/package-lock.json ./client/
```

Only the **manifest files** are copied first — not the source code. This is the fundamental trick for npm install caching. Docker will cache the `RUN npm ci` layer below as long as these files haven't changed. If you only edit a `.ts` source file, Docker reuses the cached `node_modules` — it doesn't re-download the internet.

```dockerfile
RUN npm ci --ignore-scripts
RUN npm --prefix server ci --ignore-scripts
RUN npm --prefix client ci --ignore-scripts
```

Three separate install commands:
1. Root workspace — installs `concurrently` (the only root dev dependency)
2. Server workspace — installs Express, Mongoose, JWT, bcryptjs, and all dev deps
3. Client workspace — installs React, Vite, Tailwind, and all dev deps

**`--ignore-scripts`** prevents `package.json` lifecycle scripts (`preinstall`, `postinstall`, `install`) from running. This is a **security measure**. A compromised npm package could run arbitrary code in its `install` script. In a Docker build context, you do not want unknown scripts executing.

The root `package.json` has `"postinstall": "npm --prefix server install ..."`. That hook is skipped here — which is why each sub-package is installed explicitly.

---

### Stage 2 — `build-client`

```dockerfile
FROM node:22-alpine AS build-client
WORKDIR /app
```

Fresh filesystem. The dev dependencies from stage 1 don't automatically appear here.

```dockerfile
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/client/node_modules ./client/node_modules
```

These lines reach back into the `deps` stage and copy the installed `node_modules`. This is how multi-stage builds share build artifacts — not a shared volume, but an explicit copy between filesystem snapshots.

```dockerfile
COPY client/ ./client/
COPY package.json ./
```

Now we copy the actual source code. The root `package.json` is needed because the `build:client` script is defined there.

```dockerfile
ENV VITE_API_URL=/api
ENV VITE_DEMO_MODE=true
RUN npm run build:client
```

Sets Vite environment variables and runs the client build. These `ENV` values are **baked into the compiled JavaScript** at build time — they are not runtime environment variables. Vite replaces all `import.meta.env.VITE_*` references with their literal values during the build. This produces `client/dist/` — a set of static HTML, CSS, and JS files.

`VITE_API_URL=/api` means every `fetch('/api/...')` call in the React app will go to the same server that serves the frontend — no hardcoded hostname needed.

---

### Stage 3 — `build-server`

```dockerfile
FROM node:22-alpine AS build-server
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules

COPY server/ ./server/
COPY package.json ./

RUN npm run build:server
```

The server build is `tsc -p tsconfig.build.json` (see `server/package.json`). TypeScript compiles all `.ts` files in `server/src/` to JavaScript in `server/dist/`. The `tsconfig.build.json` is separate from `tsconfig.json` — the build config excludes test files so they are not compiled into the production output.

This stage produces `server/dist/server.js` and all associated compiled files.

This stage runs **in parallel** with `build-client` via BuildKit — both only need `deps`, not each other.

---

### Stage 4 — `runtime`

This is the stage that becomes the actual Docker image you run.

```dockerfile
FROM node:22-alpine AS runtime
```

Brand new filesystem. Nothing from stages 1–3 exists here unless explicitly copied.

```dockerfile
RUN addgroup -S solarmitra && adduser -S solarmitra -G solarmitra
```

Creates a **system group** and **system user** both named `solarmitra`. Flags:
- `-S` — system account (no home directory, no password, not in `/etc/passwd` with a shell)
- `-G solarmitra` — adds the user to the group just created

Why: containers run as **root** by default. Root inside a container is the same UID (0) as root on the host. If a container escape vulnerability is ever exploited, a root container gives the attacker root on the host. A non-root user limits this blast radius. This follows the **principle of least privilege**.

```dockerfile
WORKDIR /app
```

```dockerfile
COPY --from=deps /app/server/package.json ./server/package.json
COPY --from=deps /app/server/package-lock.json ./server/package-lock.json
RUN cd server && npm ci --only=production --ignore-scripts
```

Installs **only production dependencies** for the server. `--only=production` skips everything in `devDependencies` — this excludes TypeScript, Vitest, Supertest, `tsx`, and type definitions. These are not needed to run the compiled JavaScript. The result is a much smaller `node_modules` than the full install.

```dockerfile
COPY --from=build-server /app/server/dist ./server/dist
COPY --from=build-client /app/client/dist ./client/dist
```

Copies the compiled outputs from stages 2 and 3. This is the only code in the image — no `.ts` source files, no build tools.

```dockerfile
RUN mkdir -p server/var/provider-docs && chown -R solarmitra:solarmitra /app
```

Creates the directory where provider document uploads will be stored, then transfers ownership of the entire `/app` directory to the `solarmitra` user. After this point, the non-root user owns everything it needs.

```dockerfile
USER solarmitra
```

Switches to the non-root user. All subsequent commands — and crucially, the container's entrypoint — run as this user.

```dockerfile
EXPOSE 5000
```

Documents that the container listens on port 5000. `EXPOSE` does not actually publish the port — that happens at `docker run -p 5000:5000` or in `docker-compose.yml`. It is metadata and documentation.

```dockerfile
ENV NODE_ENV=production \
    PORT=5000 \
    DEMO_MODE=true
```

Sets default environment variables. These can be overridden at runtime with `-e` flags or `env_file`. `NODE_ENV=production` makes Express skip development middleware (detailed error stacks, request logging, etc.). `DEMO_MODE=true` means the app uses in-memory seed data and does not require a MongoDB connection.

```dockerfile
CMD ["node", "server/dist/server.js"]
```

The default command to run when the container starts. Uses the `exec` form (JSON array) instead of the `shell` form (`CMD node ...`). The exec form runs `node` as PID 1 directly — not wrapped in a shell. This means:
- Unix signals (like `SIGTERM` from `docker stop`) reach the Node process directly
- Docker's graceful shutdown works correctly
- The Node process can handle `process.on('SIGTERM', ...)` properly

---

## 8. Docker Compose — Local Orchestration

### What Docker Compose Is

Docker Compose is a tool for defining and running **multi-container applications** on a single machine. You describe all services in `docker-compose.yml` and start them all with one command.

Think of it as a scripted version of `docker run` with all flags saved to a file — but also with networking, volumes, dependencies, and health checks built in.

### What "orchestration" means

When your application is more than one process (e.g., a web server AND a database), you need:
- Both containers to share a network so they can talk to each other
- The database to be ready before the app connects to it
- Persistent storage for the database that survives container restarts
- A way to start/stop the whole stack with one command

Docker Compose handles all of this.

### SolarMitra's two modes

```
docker compose up app
└── starts only the app service (DEMO_MODE=true, no MongoDB needed)

docker compose --profile mongo up
└── starts app + mongo (DEMO_MODE=false, real MongoDB)
```

This is done with Compose **profiles**.

### How Compose networking works

When you start services with Docker Compose, it creates a **virtual network** and attaches all services to it. Services can address each other by their service name as a DNS hostname.

That's why this works in `docker-compose.yml`:

```yaml
MONGO_URI: mongodb://mongo:27017/solarmitra
```

`mongo` is not a hostname you configured — it's the service name in `docker-compose.yml`. Compose's internal DNS resolves `mongo` to the MongoDB container's IP address automatically.

---

## 9. The SolarMitra `docker-compose.yml` — Line by Line

### Service: `app`

```yaml
app:
  image: solarmitra:latest
  build:
    context: .
    dockerfile: Dockerfile
```

Two ways to get the image:
1. If `solarmitra:latest` already exists locally (e.g., you ran `docker build -t solarmitra .`), it uses that.
2. If not, `docker compose up` will build it from the `Dockerfile` in the current directory.

The `build:` block also means `docker compose build` works to explicitly rebuild.

```yaml
  container_name: solarmitra-app
```

Names the running container. Without this, Compose auto-generates a name like `solarmitra-app-1`. Naming it makes `docker logs solarmitra-app` and `docker exec -it solarmitra-app sh` work predictably.

```yaml
  restart: unless-stopped
```

If the container crashes, Docker automatically restarts it. The `unless-stopped` policy means:
- Restart on crash ✓
- Restart after system reboot (if Docker daemon starts automatically) ✓
- Do NOT restart if you deliberately stopped it with `docker compose down` or `docker stop` ✓

This is important for a server that should stay running 24/7.

```yaml
  ports:
    - "5000:5000"
```

Maps host port 5000 to container port 5000. Format is `HOST:CONTAINER`. The left side is the port on your machine; the right side is the port inside the container. So visiting `http://localhost:5000` on your machine goes to port 5000 inside the container.

```yaml
  env_file:
    - path: ./server/.env
      required: false
```

Loads environment variables from `server/.env`. `required: false` means if the file doesn't exist, the container still starts (it uses the `environment:` defaults below). This lets developers who haven't set up a `.env` still run the app in demo mode.

```yaml
  environment:
    NODE_ENV: production
    PORT: "5000"
    DEMO_MODE: "true"
    MONGO_URI: mongodb://mongo:27017/solarmitra
```

These defaults are applied. If `server/.env` sets the same variable, `env_file` takes precedence (it's loaded after `environment:`).

```yaml
  volumes:
    - solarmitra-docs:/app/server/var/provider-docs
```

Mounts a **named volume** at the path where provider documents are uploaded. Without this, uploaded files are stored inside the container's writable layer — they are lost when the container is removed or recreated. With a named volume, the files live on the host's filesystem and persist across container restarts, rebuilds, and updates.

```yaml
  depends_on:
    mongo:
      condition: service_healthy
      required: false
```

Two things here:
- `condition: service_healthy` — the `app` container waits for `mongo` to pass its health check before starting. This prevents a race condition where Express tries to connect to MongoDB before MongoDB is ready.
- `required: false` — if `mongo` is not part of the active profiles (i.e., you ran `docker compose up app` without `--profile mongo`), this dependency is simply ignored. The app starts anyway.

```yaml
  healthcheck:
    test: ["CMD", "wget", "-qO-", "http://localhost:5000/api/health"]
    interval: 30s
    timeout: 5s
    retries: 3
    start_period: 15s
```

Docker periodically runs this command inside the container and checks if it exits with code 0. See [Health Checks](#15-health-checks) for a full explanation.

```yaml
  profiles:
    - ""
    - mongo
```

The empty string `""` means this service is part of the default profile — it runs when you `docker compose up app` without any `--profile` flag. It is also part of the `mongo` profile, so it runs when you do `docker compose --profile mongo up` too.

---

### Service: `mongo`

```yaml
mongo:
  image: mongo:7
  container_name: solarmitra-mongo
  restart: unless-stopped
  ports:
    - "27017:27017"
  environment:
    MONGO_INITDB_DATABASE: solarmitra
  volumes:
    - solarmitra-mongo-data:/data/db
  healthcheck:
    test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
    interval: 10s
    timeout: 5s
    retries: 5
    start_period: 10s
  profiles:
    - mongo
```

- `image: mongo:7` — uses the official MongoDB 7 image from Docker Hub. No custom build needed.
- `MONGO_INITDB_DATABASE: solarmitra` — tells MongoDB to create a database named `solarmitra` on first start.
- `volumes: solarmitra-mongo-data:/data/db` — `/data/db` is where MongoDB stores its data files. The named volume keeps the data persistent.
- `profiles: [mongo]` — only starts when `--profile mongo` is passed.
- The `healthcheck` uses `mongosh` (the MongoDB shell) to run `db.adminCommand('ping')` — a lightweight command that returns immediately if MongoDB is up and responsive.

---

### Named volumes

```yaml
volumes:
  solarmitra-mongo-data:
  solarmitra-docs:
```

Declaring named volumes at the bottom of `docker-compose.yml` registers them with Docker. Docker creates and manages these volumes on the host. You can inspect them with `docker volume ls` and `docker volume inspect solarmitra-mongo-data`.

Named volumes vs bind mounts:
- **Named volume** — Docker manages the storage location. Portable, survives `docker compose down`. Best for databases and persistent app data.
- **Bind mount** (`./host/path:/container/path`) — mounts a specific host directory. Used in development to live-reload code. Not used here.

---

## 10. GitHub Container Registry (GHCR)

### What a Container Registry Is

A container registry is a server that stores Docker images. It works like npm (for code packages) but for Docker images. When CI builds an image, it **pushes** the image to the registry. When a server (or Cloud Run) needs to run the app, it **pulls** the image from the registry.

```
CI runner → docker push → ghcr.io/owner/solarmitra:sha-abc123
                                         ↓
                             (stored in registry)
                                         ↓
Cloud environment → docker pull → gets exact image → runs container
```

### Why GHCR specifically

GitHub Container Registry (`ghcr.io`) is GitHub's own registry. SolarMitra uses it because:
- It is **free** for public repositories (and has a generous free tier for private ones)
- **No external account needed** — authentication uses the same `GITHUB_TOKEN` that GitHub Actions already has
- Images are scoped to the GitHub owner: `ghcr.io/<owner>/solarmitra`
- Deep integration with GitHub — packages show up on the repo's GitHub page

### Authentication in the pipeline

```yaml
- uses: docker/login-action@v3
  with:
    registry: ghcr.io
    username: ${{ github.actor }}
    password: ${{ secrets.GITHUB_TOKEN }}
```

`GITHUB_TOKEN` is a short-lived token automatically created by GitHub for each workflow run. It has the permissions declared in the workflow's `permissions:` block — in our case `packages: write`. It never needs to be stored in secrets manually.

---

## 11. Image Tagging and Digests

### What a Tag Is

A **tag** is a mutable, human-readable pointer to a specific image. Tags can be reassigned. `latest` today might point to a different image than `latest` tomorrow.

### What a Digest Is

A **digest** is an immutable cryptographic fingerprint (`sha256:a1b2c3...`) of the exact image content. It is computed from the image layers. Change anything in the image and the digest changes. You cannot reassign a digest — it is determined entirely by the image content.

### SolarMitra's three tags

```yaml
tags: |
  type=sha,prefix=sha-
  type=raw,value=latest,enable={{is_default_branch}}
  type=ref,event=branch
```

| Generated tag | Example | Behaviour |
|--------------|---------|-----------|
| `sha-a1b2c3d` | `ghcr.io/.../solarmitra:sha-a1b2c3d` | Immutable — tied to a specific commit |
| `latest` | `ghcr.io/.../solarmitra:latest` | Always updated to newest build of main |
| `main` | `ghcr.io/.../solarmitra:main` | Tracks the main branch |

### Why use digest for deployment

The deploy job uses the image by digest:

```yaml
image: ${{ env.IMAGE_NAME }}@${{ needs.docker.outputs.image_digest }}
```

This is the safest way to deploy. Even if someone pushes a new `latest` between the build and the deploy step, the deploy uses the exact image (`sha256:...`) that was built and tested in CI — not whatever `latest` happens to point to at deploy time.

---

## 12. Docker Layer Caching

### How Docker Caching Works

Every Dockerfile instruction that produces a filesystem change creates a **layer**. Each layer has a cache key based on:
1. The instruction text
2. The content of any files in a `COPY` instruction
3. The cache key of the previous layer

If a layer's cache key is unchanged, Docker reuses the cached layer. If it changes, Docker invalidates that layer AND all subsequent layers (because later layers may depend on earlier ones).

### The order of instructions matters enormously

**Bad order (cache misses on every code change):**
```dockerfile
COPY . .                  # copies ALL source — invalidated on any file change
RUN npm ci                # re-runs even if package.json didn't change — SLOW
RUN npm run build
```

**Good order (cache hit on most builds):**
```dockerfile
COPY package.json package-lock.json ./   # rarely changes → usually cached
RUN npm ci                               # only re-runs when packages change → FAST
COPY src/ ./                             # changes often → cache busted here
RUN npm run build                        # re-runs when source changes
```

SolarMitra's Dockerfile follows the good pattern. `package.json` and `package-lock.json` are copied before source files. `npm ci` is cached until dependencies change.

### GitHub Actions Cache for Docker layers

```yaml
cache-from: type=gha
cache-to: type=gha,mode=max
```

By default, each CI run starts with a fresh runner — Docker has no layer cache. BuildKit's `type=gha` cache backend stores Docker image layers inside GitHub Actions' own cache storage (separate from the `actions/setup-node` npm cache).

- `cache-from: type=gha` — before building, pull any matching cached layers from GHA cache
- `cache-to: type=gha,mode=max` — after building, push ALL layers to GHA cache (not just the final stage)

`mode=max` is important. Without it, only the final `runtime` stage layers are cached. With `mode=max`, the intermediate stages (`deps`, `build-client`, `build-server`) are also cached. On a subsequent push that only changes source code (not packages), the `deps` stage with its `npm ci` is served entirely from cache — the largest, slowest step is free.

### Practical impact

| Scenario | Without cache | With `type=gha,mode=max` |
|---------|--------------|--------------------------|
| Only source files changed | ~4–6 min (re-installs all packages) | ~1–2 min (npm ci cached) |
| Only package.json changed | ~4–6 min | ~4–6 min (cache busted by package change) |
| Nothing changed (re-run) | ~4–6 min | ~30 sec (all layers cached) |

---

## 13. Security Practices in the Dockerfile

### Non-Root User

```dockerfile
RUN addgroup -S solarmitra && adduser -S solarmitra -G solarmitra
...
USER solarmitra
```

**Why this matters:** By default, Docker containers run all processes as root (UID 0). Root inside a container is the same UID as root on the host machine. If an attacker exploits a vulnerability in your application (e.g., a Remote Code Execution bug in a dependency) and there is a container escape vulnerability in Docker itself, they could gain root on the host.

Running as a non-root user with no password and no shell (`-S` system user) significantly limits what an attacker can do even if they compromise the container process.

### Alpine Base Image

`node:22-alpine` uses Alpine Linux — a minimal distribution with only essential packages. The full `node:22` (Debian-based) image includes many more system libraries, each a potential source of known CVEs. A smaller OS footprint = smaller attack surface.

Security scanners (like Trivy or Snyk) will report far fewer vulnerabilities on an Alpine-based image.

### `--ignore-scripts` on all npm installs

```dockerfile
RUN npm ci --ignore-scripts
RUN npm --prefix server ci --ignore-scripts
RUN npm --prefix client ci --ignore-scripts
```

npm lifecycle scripts (`preinstall`, `install`, `postinstall`) run arbitrary shell commands defined by the package author. A malicious or compromised package on npm could use `postinstall` to exfiltrate environment variables, modify files, or establish a reverse shell.

`--ignore-scripts` prevents any lifecycle scripts from running during installation. Since Docker build context often has access to source code and build secrets, this is a prudent security measure.

### Production-only dependencies in the runtime stage

```dockerfile
RUN cd server && npm ci --only=production --ignore-scripts
```

The runtime stage only installs production dependencies — no TypeScript, no Vite, no test framework. Dev tools are:
1. Not needed to run compiled JavaScript
2. Often have higher vulnerability counts (build tools are large and updated less carefully than runtime libraries)
3. Larger, making the image slower to pull

### No TypeScript source files in the final image

The `COPY` commands in the runtime stage only pull from `build-server` and `build-client` outputs:

```dockerfile
COPY --from=build-server /app/server/dist ./server/dist
COPY --from=build-client /app/client/dist ./client/dist
```

An attacker who gains container access sees compiled JavaScript — not the TypeScript source with comments, business logic annotations, or TODO notes that might reveal architectural weaknesses.

### `chown` before `USER`

```dockerfile
RUN mkdir -p server/var/provider-docs && chown -R solarmitra:solarmitra /app
USER solarmitra
```

The `chown` runs as root (the default before `USER` is set) to transfer ownership of `/app` to the `solarmitra` user. After `USER solarmitra`, the process runs without root and therefore cannot `chown` anything. If you put `USER solarmitra` before `chown`, the chown would fail with a permissions error.

---

## 14. Secrets Management in CI

### The Problem

Applications need sensitive configuration: JWT signing secrets, database connection strings with passwords. These must **never** be:
- Hard-coded in source files (public git repository = anyone can read them)
- Printed in CI/CD logs (logs are often archived and accessible to many people)
- Baked into Docker images (images in a registry are readable by anyone with pull access)

### GitHub Actions Secrets

Secrets are stored in the GitHub repository's `Settings → Secrets and variables → Actions` page. They are:
- Encrypted at rest with a per-repo key
- Never printed in logs — GitHub automatically redacts them (replaces with `***`)
- Only accessible to workflow runs triggered on the repo

Referenced in YAML as `${{ secrets.SECRET_NAME }}`.

SolarMitra has these secrets defined (ready for when deployment is activated):

| Secret name | What it is |
|------------|-----------|
| `GCP_PROJECT_ID` | Google Cloud project identifier |
| `GCP_SA_KEY` | JSON key for a GCP service account |
| `GCP_REGION` | Cloud Run region (e.g. `asia-south1`) |
| `CLOUD_RUN_SERVICE` | Name of the Cloud Run service |
| `JWT_SECRET` | Secret key for signing JSON Web Tokens |
| `MONGO_URI` | MongoDB Atlas connection string |

### Ephemeral CI secrets

The CI job itself uses a throwaway JWT secret:

```yaml
- run: npm --prefix server test
  env:
    JWT_SECRET: "ci_only_secret_not_for_production"
```

This is intentional. Tests need `JWT_SECRET` to be set so the server starts. Using a hardcoded nonsense value in CI is safe because:
1. It only exists for the duration of the test run
2. It is not a real secret — it protects no real data
3. Using a real secret in a `run:` step risks it appearing in debug output

### Local development secrets

For local development, secrets go in `server/.env` which is listed in `.gitignore`. Docker Compose reads this via:

```yaml
env_file:
  - path: ./server/.env
    required: false
```

The `required: false` means the container starts even without the file (demo mode uses defaults).

---

## 15. Health Checks

### Why Health Checks Exist

A container can be **running** (the process started successfully) without being **ready** (able to serve traffic). For example:
- The Node.js server takes 2–3 seconds to initialise
- The Express app tries to connect to MongoDB on startup — this might take 5–10 seconds
- A dependency fails to load and the process is technically running but in an error state

Without health checks, Docker and Compose would try to route traffic to the container the moment it starts — before it's ready. The result is connection errors or 500s during startup.

Health checks tell Docker: "run this command periodically; if it fails N times in a row, mark this container unhealthy."

### The `app` service health check

```yaml
healthcheck:
  test: ["CMD", "wget", "-qO-", "http://localhost:5000/api/health"]
  interval: 30s
  timeout: 5s
  retries: 3
  start_period: 15s
```

- `test:` — the command to run. `wget -qO-` makes an HTTP GET request and prints the response body to stdout. It exits 0 on success, 1 on failure. The `/api/health` endpoint on the Express server returns HTTP 200 when the server is up.
- `interval: 30s` — check every 30 seconds after the `start_period`.
- `timeout: 5s` — if the check takes more than 5 seconds, treat it as a failure.
- `retries: 3` — the container is only marked `unhealthy` after 3 consecutive failures.
- `start_period: 15s` — Docker waits 15 seconds before counting failures. This grace period allows the server to start without triggering false-positive unhealthy status.

### The `mongo` service health check

```yaml
healthcheck:
  test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 10s
```

Uses `mongosh` (the MongoDB shell) to run a ping command. MongoDB can take several seconds to fully initialise its storage engine on first start, so `start_period: 10s` and `retries: 5` give it more room.

### How this interacts with `depends_on`

```yaml
depends_on:
  mongo:
    condition: service_healthy
```

`condition: service_healthy` means Docker Compose does not start the `app` container until `mongo`'s health check passes. This prevents the race condition where Express tries to connect to MongoDB before MongoDB is ready to accept connections.

Without this, you'd often see MongoDB connection errors in the app logs on startup, requiring a manual restart.

---

## 16. How All the Pieces Connect

### The developer workflow

```
1. Write code locally
2. Run locally with:
      docker compose up app          (demo mode)
   or docker compose --profile mongo up  (with real MongoDB)

3. Open a Pull Request to main
   → GitHub Actions triggers
   → ci job runs:
       ✓ npm ci
       ✓ typecheck (TypeScript strict check)
       ✓ server tests (vitest + supertest)
       ✓ client tests (vitest)
       ✓ build check (Vite + tsc)
   → PR gets a green checkmark (or red X)

4. PR is reviewed and merged to main
   → GitHub Actions triggers again
   → ci job runs (same as above)
   → docker job runs (only if ci passed, only on main push):
       ✓ Docker Buildx installed
       ✓ Authenticated to GHCR
       ✓ Tags generated (sha-xxxx, latest, main)
       ✓ 4-stage Dockerfile built:
             Stage 1: install all deps
             Stage 2: build React (Vite → client/dist)
             Stage 3: build Express (tsc → server/dist)
             Stage 4: runtime image (lean, non-root, prod-only deps)
       ✓ Image pushed to ghcr.io/<owner>/solarmitra
       ✓ Image digest output for downstream jobs

   → deploy job (written, not yet activated):
       - Would authenticate to GCP
       - Would deploy the exact image by digest to Cloud Run
```

### How the Dockerfile and CI pipeline interact

The pipeline's `docker` job calls the exact same `Dockerfile` that developers use locally. This is intentional — local and CI builds are identical. The only differences are:

| Aspect | Local build | CI build |
|--------|------------|---------|
| Command | `docker build -t solarmitra .` | `docker/build-push-action` |
| Result | Local image | Pushed to GHCR |
| Layer cache | Local Docker cache | GitHub Actions cache (`type=gha`) |
| Build args | None (uses Dockerfile ENV defaults) | `VITE_API_URL=/api VITE_DEMO_MODE=true` |

### The full technology map

```
┌─────────────────────────────────────────────────────┐
│  Source code (git repository)                       │
│  ├── Dockerfile          (how to build the image)   │
│  ├── docker-compose.yml  (how to run it locally)    │
│  └── .github/workflows/  (how to automate it)       │
└─────────────────────────────────────────────────────┘
           │ push / PR
           ▼
┌─────────────────────────────────────────────────────┐
│  GitHub Actions                                     │
│  ├── Runner: ubuntu-latest VM (fresh each run)      │
│  ├── Job 1 (ci): typecheck → test → build           │
│  ├── Job 2 (docker): multi-stage build → GHCR push  │
│  └── Job 3 (deploy): ready, not yet activated       │
└─────────────────────────────────────────────────────┘
           │ docker push
           ▼
┌─────────────────────────────────────────────────────┐
│  GitHub Container Registry (ghcr.io)                │
│  └── ghcr.io/<owner>/solarmitra                     │
│       ├── :sha-a1b2c3d  (immutable, per-commit)     │
│       ├── :latest        (always newest)            │
│       └── :main          (tracks branch)            │
└─────────────────────────────────────────────────────┘
           │ (future: deploy job pulls and deploys)
           ▼
    Cloud Run / any container platform
```

### Summary table — every DevOps concept used

| Concept | File | Purpose |
|---------|------|---------|
| Continuous Integration | `.github/workflows/ci-cd.yml` | Auto-validate every PR and push |
| GitHub Actions workflow | `ci-cd.yml` | The automation engine |
| GitHub Actions events | `on: push / pull_request` | What triggers the pipeline |
| GitHub Actions jobs | `ci`, `docker`, `deploy` | Units of work on separate VMs |
| GitHub Actions steps | Each `- name:` block | Individual commands within a job |
| Marketplace Actions | `checkout`, `setup-node`, etc. | Reusable automation units |
| `needs:` dependencies | `docker: needs: ci` | Sequential job execution |
| `if:` conditions | `github.ref == 'refs/heads/main'` | Run only on main branch pushes |
| GitHub Actions Secrets | `${{ secrets.* }}` | Encrypted sensitive config for CI |
| npm cache | `cache: "npm"` in setup-node | Speed up dependency install |
| Docker containerisation | `Dockerfile` | Package app + runtime together |
| Multi-stage builds | 4 `FROM` blocks in Dockerfile | Lean production image without dev tools |
| Alpine base image | `node:22-alpine` | Minimal, secure Linux base |
| `COPY` ordering | Package files before source | Maximise layer cache hits |
| `--ignore-scripts` | All `npm ci` calls | Prevent malicious install hooks |
| Non-root user | `adduser -S solarmitra` | Principle of least privilege |
| `CMD exec form` | `["node", "server/dist/server.js"]` | Direct signal handling, no shell wrapper |
| Docker Compose | `docker-compose.yml` | Local multi-container orchestration |
| Compose profiles | `profiles: [mongo]` | Optional MongoDB service |
| `depends_on: service_healthy` | `app` depends on `mongo` | Prevent startup race conditions |
| Named volumes | `solarmitra-docs`, `solarmitra-mongo-data` | Persistent storage beyond container lifetime |
| `restart: unless-stopped` | Both services | Auto-restart on crash |
| Health checks | Both services | Verify readiness, not just liveness |
| Docker BuildKit | `docker/setup-buildx-action` | Parallel stages, better caching |
| GHA layer cache | `cache-from/to: type=gha` | Reuse Docker layers between CI runs |
| GHCR registry | `ghcr.io/<owner>/solarmitra` | Store and version Docker images |
| Image tags | `sha-`, `latest`, `main` | Human-readable version pointers |
| Image digest | `sha256:...` in deploy | Immutable image reference for safe deploys |
| Job outputs | `image_digest` from docker → deploy | Pass data between jobs |

---

*Every entry in the table above maps to real code in this repository. Nothing here is hypothetical.*
