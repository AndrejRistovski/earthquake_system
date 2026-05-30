# Earthquake System

A full-stack web application for browsing and visualising earthquake data. The backend periodically
ingests events from the public [USGS earthquake feed](https://earthquake.usgs.gov/earthquakes/feed/v1.0/),
stores them in PostgreSQL, and exposes a read-only REST API. The frontend is a React single-page
application that lists the events and plots them on an interactive map.

The repository is a client/server monorepo with separate `backend/` and `frontend/` directories, and
ships with Dockerfiles and a Docker Compose stack for running everything in containers.

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

## Continuous Integration

Continuous integration runs on **GitHub Actions** (`.github/workflows/ci.yml`): it builds and tests both
the backend and the frontend on push. *(Publishing a tagged image to a container registry is being added
separately.)*

---

## Project Structure

```
earthquake_system/
├── .github/workflows/ci.yml          # GitHub Actions CI pipeline
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
└── README.md
```

---

## Repository

https://github.com/AndrejRistovski/earthquake_system
