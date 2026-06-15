# Earthquake System

A full-stack web application for browsing and visualising earthquake data. The backend periodically
ingests events from the public [USGS earthquake feed](https://earthquake.usgs.gov/earthquakes/feed/v1.0/),
stores them in PostgreSQL, and exposes a read-only REST API. The frontend is a React single-page
application that lists the events and plots them on an interactive map.

The repository is a client/server monorepo with separate `backend/` and `frontend/` directories, and
ships with Dockerfiles, a Docker Compose stack, Kubernetes manifests, and a GitHub Actions CI/CD pipeline.

> **Note:** the HTTP API is **read-only**. Earthquake records are not created through the API — they are
> pulled from the USGS feed on a schedule (see [Scheduled jobs](#scheduled-jobs)). There are no
> `POST`/`PUT`/`DELETE` endpoints.

---

## Tech Stack

**Backend** (`backend/earthquake_backend`)

| Concern        | Choice |
|----------------|--------|
| Language / runtime | Java 21 |
| Framework      | Spring Boot 4.0.x (Web MVC, Data JPA, Validation) |
| Database       | PostgreSQL 16 |
| Migrations     | Flyway (`spring.jpa.hibernate.ddl-auto=validate` — schema owned by migrations, not Hibernate) |
| API docs       | springdoc-openapi (Swagger UI) |
| Build          | Maven (via the bundled `mvnw` wrapper) |
| Tests          | JUnit 5 + Spring Boot Test + Testcontainers (PostgreSQL) |
| Convenience    | Lombok, Spring Boot DevTools, Spring Boot Docker Compose support |

**Frontend** (`frontend/earthquake_frontend`)

| Concern        | Choice |
|----------------|--------|
| Language       | TypeScript |
| Framework      | React 19 |
| Build tool     | Vite 8 |
| UI             | MUI (Material UI) v9 + Emotion |
| Data fetching  | TanStack React Query 5 + axios |
| Routing        | React Router 7 |
| Maps           | Leaflet + react-leaflet |
| Tests          | Vitest + Testing Library + MSW (unit), Playwright (e2e) |
| Production serving | nginx (unprivileged) |

---

## Prerequisites

For the containerised workflow you only need:

- Docker and Docker Compose v2

For running the apps directly on your host:

- Java 21 (JDK)
- Node.js >= 20.19 (the repo pins `20.19.0` via `.nvmrc`)
- Docker (used to provide PostgreSQL; see below)
- Maven is **not** required — use the bundled `./mvnw` wrapper

---

## Running with Docker (recommended)

The Compose file lives in `backend/earthquake_backend/docker-compose.yaml` and orchestrates three
services: `postgres`, `backend`, and `frontend`. Both application services build from their respective
multi-stage Dockerfiles.

Because the database and the application services serve two different workflows, the app services are
gated behind a Compose **profile**. This is the single most important thing to know about running the
project:

```bash
cd backend/earthquake_backend

# DB ONLY — starts just PostgreSQL (for local-on-host development, see next section).
docker compose up -d

# FULL STACK — starts PostgreSQL + backend + frontend, building images as needed.
docker compose --profile app up --build
```

A bare `docker compose up` deliberately starts **only** the database, because `backend` and `frontend`
declare `profiles: ["app"]` while `postgres` does not. To bring up the whole application you must pass
`--profile app`.

Once the full stack is up:

| Service   | URL                                   |
|-----------|---------------------------------------|
| Frontend  | http://localhost:8080                 |
| Backend   | http://localhost:9090                 |
| Swagger UI| http://localhost:9090/swagger-ui.html |
| PostgreSQL| `localhost:5440` (container port 5432)|

The frontend's nginx config proxies `/api/*` to the backend, so the browser bundle issues same-origin
requests — no CORS configuration is needed in the container setup. The Vite `VITE_API_BASE_URL` is baked
to `""` at build time for exactly this reason (it is a build-time value; Vite has no runtime override).

### Configuration

Every Compose variable has a sensible default, so the stack runs with no extra setup. To override
credentials or ports, create a `.env` file next to the Compose file (`backend/earthquake_backend/.env`) —
it is git-ignored and never baked into images:

| Variable                  | Default | Purpose |
|---------------------------|---------|---------|
| `POSTGRES_DB`             | `earthquake_db` | Database name |
| `POSTGRES_USER`           | `admin` | Database user |
| `POSTGRES_PASSWORD`       | `admin` | Database password |
| `POSTGRES_HOST_PORT`      | `5440`  | Host port mapped to Postgres 5432 |
| `BACKEND_HOST_PORT`       | `9090`  | Host port for the backend |
| `FRONTEND_HOST_PORT`      | `8080`  | Host port for the frontend (nginx) |
| `APP_CORS_ALLOWED_ORIGINS`| `http://localhost:5173,http://localhost:5174` | Allowed origins (relevant only for host dev) |

> The default `admin`/`admin` credentials are development defaults. Override them via `.env` for any
> non-local use.

Database data persists in the named volume `earthquake_data`. To wipe it, run
`docker compose down -v`.

---

## Running on the host (development)

The intended dev loop runs the database in a container and the two apps natively, with hot reload.

### Backend

```bash
cd backend/earthquake_backend
./mvnw spring-boot:run
```

`application.properties` points the datasource at `localhost:5440`, which matches the Postgres port the
Compose file exposes. With the Spring Boot Docker Compose integration on the classpath, `spring-boot:run`
will **automatically start the `postgres` service** from `docker-compose.yaml` (and only that service,
since the app services are behind the `app` profile). If you prefer to manage it yourself, run
`docker compose up -d` first.

The API is served at `http://localhost:9090`.

### Frontend

```bash
cd frontend/earthquake_frontend
cp .env.example .env     # sets VITE_API_BASE_URL=http://localhost:9090
npm ci
npm run dev
```

The Vite dev server runs at `http://localhost:5173`.

---

## Build & test

**Backend:**

```bash
cd backend/earthquake_backend
./mvnw clean package        # runs tests (Testcontainers requires a running Docker daemon)
./mvnw test                 # tests only
```

**Frontend:**

```bash
cd frontend/earthquake_frontend
npm run build               # type-check (tsc -b) + vite build → dist/
npm run test:unit           # Vitest
npm run test:e2e            # Playwright (chromium)
npm run lint                # ESLint
```

---

## API Reference

Base path: `/api/earthquakes`. All endpoints are `GET` (read-only). Shared query parameters:

| Parameter      | Type / format | Description |
|----------------|---------------|-------------|
| `minMagnitude` | number ≥ 0.0  | Minimum magnitude filter |
| `categories`   | enum set: `SMALL` (0–4), `MEDIUM` (4–7), `LARGE` (≥7) | Filter by magnitude band; repeatable |
| `from`         | ISO-8601 datetime | Lower time bound (inclusive) |
| `to`           | ISO-8601 datetime | Upper time bound |

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/earthquakes` | Paginated list. Adds Spring `Pageable` params: `page`, `size` (default 20, max 200), `sort` (default `time,desc`). Returns a `PageResponse`. |
| `GET`  | `/api/earthquakes/all` | Full (unpaginated) list matching the filters. |

Interactive documentation is available via Swagger UI at `/swagger-ui.html` and the OpenAPI spec at
`/v3/api-docs` (springdoc defaults).

---

## Scheduled jobs

The backend runs two scheduled tasks (configurable in `application.properties`):

| Job                | Default schedule | Property |
|--------------------|------------------|----------|
| USGS ingestion     | every 15 minutes (`0 */15 * * * *`) | `app.usgs.refresh-cron` |
| Retention pruning  | daily at 03:00 (`0 0 3 * * *`); deletes events older than 31 days | `app.retention.cron`, `app.retention.days` |

The feed URL and minimum ingest magnitude are configured via `app.usgs.url` and `app.usgs.min-magnitude`.

---

## Continuous Integration & Delivery

CI runs on **GitHub Actions**. The pipeline is split per component so a change to one side doesn't
rebuild the other (each workflow is path-filtered):

- **`.github/workflows/backend-ci.yml`** — sets up JDK 21, runs `./mvnw clean verify` (unit +
  integration tests via Testcontainers, JaCoCo coverage), validates the Compose file, then builds the
  backend image.
- **`.github/workflows/frontend-ci.yml`** — installs with `npm ci`, lints, runs Vitest + Playwright,
  produces a production build, then builds the frontend image.

On **push to `main`**, both workflows authenticate to Docker Hub and **push** the freshly built image;
on pull requests the image is built but **not** pushed (validation only). Each image is tagged twice:

| Image | Tags |
|-------|------|
| `andrejristovskivip/earthquake-backend`  | `latest`, `<git-sha>` |
| `andrejristovskivip/earthquake-frontend` | `latest`, `<git-sha>` |

Pushing requires two repository secrets: `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN`.

On push to `main`, each workflow then pins its image to the new commit SHA in the matching `k8s/`
manifest and commits it back — the change Argo CD picks up to deploy. See
[Continuous Delivery](#continuous-delivery-argo-cd).

---

## Kubernetes

The `k8s/` directory runs the full stack on a Kubernetes cluster. Every object lives in a dedicated
`earthquake` namespace and the files apply in numeric order (dependencies first):

| File | Objects |
|------|---------|
| `00-namespace.yml` | `earthquake` **Namespace** |
| `10-db.yml` | PostgreSQL **StatefulSet** with a `volumeClaimTemplates` per-pod PVC, a headless **Service** (`earthquake-db`), a **ConfigMap** (`POSTGRES_DB`, `PGDATA`) and a **Secret** (`POSTGRES_USER` / `POSTGRES_PASSWORD`) |
| `20-backend.yml` | Backend **Deployment** (`andrejristovskivip/earthquake-backend:latest`), ClusterIP **Service** (`:9090`) and a **ConfigMap**. Datasource credentials are read from the DB Secret via `secretKeyRef`; an init container blocks startup until Postgres accepts TCP. |
| `30-frontend.yml` | Frontend **Deployment** (`andrejristovskivip/earthquake-frontend:latest`), ClusterIP **Service** (`:8080`) and a **ConfigMap** that injects the runtime `nginx.conf` (the in-cluster build drops the Compose-only `/api` proxy — the Ingress routes `/api` directly). |
| `40-ingress.yml` | A single **Ingress** (`earthquake.local`) routing `/api` → backend `:9090` and `/` → frontend `:8080`. |

### Deploy to a local K3D cluster

The manifests target K3D defaults (`traefik` ingress class, `local-path` storage class). Create a
cluster with the load balancer mapped to host port 80, then apply everything:

```bash
# 1. Create a cluster that exposes Traefik on http://localhost
k3d cluster create earthquake -p "80:80@loadbalancer"

# 2. Apply all manifests (numeric order resolves dependencies)
kubectl apply -f k8s/

# 3. Wait for the app Deployments to roll out
kubectl -n earthquake rollout status deploy/earthquake-backend
kubectl -n earthquake rollout status deploy/earthquake-frontend
```

Then map the Ingress host locally and browse **http://earthquake.local**:

- **Linux / macOS:** `echo "127.0.0.1 earthquake.local" | sudo tee -a /etc/hosts`
- **Windows:** add `127.0.0.1 earthquake.local` to `C:\Windows\System32\drivers\etc\hosts`

### Demonstration

With the manifests applied, all objects come up healthy in the `earthquake` namespace:

```text
$ kubectl -n earthquake rollout status deploy/earthquake-backend
deployment "earthquake-backend" successfully rolled out
$ kubectl -n earthquake rollout status deploy/earthquake-frontend
deployment "earthquake-frontend" successfully rolled out

$ kubectl -n earthquake get pods,svc,pvc,ingress
NAME                                       READY   STATUS    RESTARTS   AGE
pod/earthquake-backend-86d4f59fcc-gt2gd    1/1     Running   0          7m30s
pod/earthquake-frontend-57bfbdccf9-xk7th   1/1     Running   0          7m30s
pod/earthquake-postgres-0                  1/1     Running   0          7m30s

NAME                          TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)    AGE
service/earthquake-backend    ClusterIP   10.43.165.12    <none>        9090/TCP   7m30s
service/earthquake-db         ClusterIP   None            <none>        5432/TCP   7m30s
service/earthquake-frontend   ClusterIP   10.43.247.138   <none>        8080/TCP   7m30s

NAME                                              STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   AGE
persistentvolumeclaim/data-earthquake-postgres-0  Bound    pvc-a4d8c125-593d-4733-93d3-4f1c010ffa2d   1Gi        RWO            local-path     7m30s

NAME                                   CLASS     HOSTS              ADDRESS                 PORTS   AGE
ingress.../earthquake                  traefik   earthquake.local   172.20.0.3,172.20.0.4   80      7m30s
```

Screenshots of the live cluster are under [`docs/`](docs/).

---

## Continuous Delivery (Argo CD)

Deployment uses a **pull-based GitOps** model with [Argo CD](https://argo-cd.readthedocs.io/).
Argo CD runs *inside* the cluster and continuously reconciles the live state against the manifests in
`k8s/`. Because the cluster pulls from GitHub (rather than CI pushing into the cluster), this works even
though the K3D cluster is local and unreachable from GitHub-hosted runners.

### The deploy loop

```text
git push ─▶ GitHub Actions ─▶ build image + push to Docker Hub (tag :<sha>)
                              └▶ pin :<sha> into k8s/20-backend.yml (or 30-frontend.yml),
                                 commit back to main
                                                    │
                  Argo CD (in-cluster) sees the new commit ◀┘
                              └▶ syncs k8s/ → rolling update in the `earthquake` namespace
```

The image tag in Git changes on every push, so Argo CD always has a new desired state to apply — a bare
`:latest` would never produce a diff and nothing would roll out.

### One-time bootstrap

```bash
# 1. Install Argo CD into its own namespace
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
kubectl -n argocd rollout status deploy/argocd-server

# 2. Register the app (auto-sync, self-heal, auto-create the earthquake namespace)
kubectl apply -f argocd/application.yaml

# 3. (optional) Open the Argo CD UI
kubectl -n argocd port-forward svc/argocd-server 8081:443   # → https://localhost:8081
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath='{.data.password}' | base64 -d ; echo         # initial password (user: admin)
```

After that, every push to `main` deploys automatically. Watch a rollout with
`kubectl -n earthquake rollout status deploy/earthquake-backend`, or follow it live in the Argo CD UI.

> **Secrets:** `k8s/10-db.yml` ships the dev `admin`/`admin` Postgres credentials as a plaintext
> `Secret` so the project runs out of the box. For anything beyond local/dev, keep secrets out of Git
> with [Sealed Secrets](https://github.com/bitnami-labs/sealed-secrets) or SOPS and let Argo CD decrypt
> them at sync time.

---

## Project Structure

```
earthquake_system/
├── .github/workflows/
│   ├── backend-ci.yml            # build + test + push backend image (Docker Hub)
│   └── frontend-ci.yml           # build + test + push frontend image (Docker Hub)
├── backend/
│   └── earthquake_backend/
│       ├── Dockerfile                # multi-stage: temurin JDK build → JRE runtime
│       ├── docker-compose.yaml       # postgres (+ app profile: backend, frontend)
│       ├── .dockerignore
│       ├── mvnw, pom.xml
│       └── src/
│           ├── main/java/mk/earthquake_backend/   # controllers, services, repositories, model
│           └── main/resources/
│               ├── application.properties
│               └── db/migration/     # Flyway migrations (V1, V2, ...)
├── frontend/
│   └── earthquake_frontend/
│       ├── Dockerfile                # multi-stage: node build → nginx-unprivileged runtime
│       ├── nginx.conf                # SPA serving + /api proxy to backend
│       ├── .dockerignore, .env.example
│       ├── package.json
│       └── src/                      # components, pages, API client
├── k8s/                              # Kubernetes manifests (applied in numeric order)
│   ├── 00-namespace.yml             # earthquake namespace
│   ├── 10-db.yml                    # Postgres StatefulSet + headless Service + ConfigMap/Secret
│   ├── 20-backend.yml               # backend Deployment + Service + ConfigMap
│   ├── 30-frontend.yml              # frontend Deployment + Service + nginx ConfigMap
│   └── 40-ingress.yml               # Ingress (earthquake.local)
├── argocd/
│   └── application.yaml              # Argo CD Application (GitOps CD → earthquake namespace)
├── docs/                             # deployment screenshots / demo evidence
└── README.md
```

---

## Repository

https://github.com/AndrejRistovski/earthquake_system
