# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run the application (auto-starts Postgres via spring-boot-docker-compose)
./mvnw spring-boot:run        # macOS/Linux
mvnw.cmd spring-boot:run      # Windows

# Build (skip tests)
./mvnw clean package -DskipTests

# Run all tests
./mvnw test

# Run a specific test class
./mvnw test -Dtest=EarthquakeServiceImplTest

# Start Postgres manually (only needed when running the packaged jar;
# `mvn spring-boot:run` boots it automatically via spring-boot-docker-compose)
docker compose up -d

# Build Docker image for the backend
docker build -t earthquake-backend .
```

The app runs on **port 9090**. Swagger UI is available at `http://localhost:9090/swagger-ui/index.html`.

## Architecture

This is a **Spring Boot 4.0.6 / Java 21** REST API that ingests earthquake data from the USGS feed and stores it in PostgreSQL.

**Layered structure** under `src/main/java/mk/earthquake_backend/`:

- `web/controller/` — REST controllers (`/api/earthquakes`)
- `web/handler/` — `@RestControllerAdvice` returning RFC 7807 `ProblemDetail`: `UsgsApiException` → 502, `ConstraintViolationException` and `MethodArgumentTypeMismatchException` → 400, fallthrough `Exception` → 500
- `service/interfaces/` + `service/implementations/` — fetches from USGS, filters by magnitude (`>=` `app.usgs.min-magnitude`), and **upserts by `usgsId`** so revisions to existing events propagate without losing history
- `jobs/` — two schedulers:
  - `EarthquakeIngestionScheduler` — `@EventListener(ApplicationReadyEvent.class)` performs startup priming immediately after context load, AND `@Scheduled(cron = "${app.usgs.refresh-cron}")` (default every 15 min) keeps the data fresh. Both paths call the same idempotent service method (upsert by `usgsId`).
  - `EarthquakeRetentionScheduler` — calls `deleteByTimeBefore(now - app.retention.days)` on `${app.retention.cron}` (default daily at 03:00)
  Both enabled by `@EnableScheduling` on the main class
- `repository/` — Spring Data JPA. `EarthquakeRepository` extends `JpaSpecificationExecutor<Earthquake>` and exposes `findByUsgsId` (used for upsert) and `deleteByTimeBefore` (retention prune). Filter predicates live in `EarthquakeSpecifications` (time range, min magnitude, category union) and compose via `Specification.and()`.
- `model/domain/` — `Earthquake` JPA entity (Lombok `@Builder`, immutable, unique `usgs_id`)
- `model/enums/` — `MagnitudeCategory` enum (SMALL `[0,4)`, MEDIUM `[4,7)`, LARGE `[7,∞)`). Mirrored on the frontend in `util/magnitude.ts`.
- `model/dto/response/` — `EarthquakeResponseDto` (Java record, returned to clients) and `PageResponse<T>` (stable wire wrapper for paginated queries; intentionally narrower than Spring's `Page<T>` JSON shape)
- `model/dto/external/` — `UsgsResponseDto` and related records mapping the USGS GeoJSON response
- `model/mapper/` — `EarthquakeMapper` for entity ↔ DTO conversions
- `model/exceptions/` — `UsgsApiException` (runtime, wraps USGS API failures)
- `config/` — `WebConfig` (CORS: `GET, POST` only on `/api/**`, origins from `app.cors.allowed-origins`) and `RestTemplateConfig` (5s connect, 10s read timeouts on the USGS client — failed fetches surface as `UsgsApiException` → HTTP 502)

**Database**: PostgreSQL 16 on port `5440` (mapped from 5432). Schema managed by Flyway; migrations live in `src/main/resources/db/migration/` (currently just `V1__create_earthquakes.sql`). `ddl-auto=validate` — Hibernate will fail to start if the entity drifts from the schema, so every entity change requires a new `V{n}__*.sql` migration. PK is `BIGSERIAL`, `time` is `TIMESTAMPTZ`, `usgs_id` carries a unique constraint.

**External API**: USGS GeoJSON feed configured via `app.usgs.url`, `app.usgs.min-magnitude`, and `app.usgs.refresh-cron` (default every 15 min). The default feed is `all_month.geojson` so the DB can serve the longest UI preset (30 days) without re-querying USGS per request. Default min magnitude `0.5` (`>=`).

**Retention**: `app.retention.days` (default 31) and `app.retention.cron` (daily 03:00) bound the table size. The retention job is decoupled from ingestion so a failure in one doesn't block the other.

## Design notes

- **Upsert by `usgsId`.** USGS revises events post-hoc (magnitudes get refined). The ingestion path looks up the existing row by `usgsId` and rebuilds via the entity builder, copying the existing primary key, so JPA performs an `UPDATE` instead of an `INSERT`. The entity stays immutable.
- **Magnitude filter is `>=`** so an event at exactly the threshold is included.
- **Scheduling is always on.** `@EnableScheduling` is set on `EarthquakeBackendApplication`; both jobs run in every profile unless the cron expressions are overridden or the beans removed.
- **Default query window.** Both query methods default to the last 24h when both `from` and `to` are null.
- **Filter composition lives in `EarthquakeSpecifications`.** Each factory returns a no-op (`cb.conjunction()`) on null/empty input, so callers always `.and()` predicates without null-checking. Categories use `OR` across selected values (disjoint ranges like SMALL ∪ LARGE work correctly). The composite spec is shared between the paginated and unpaged endpoints.
- **No manual refresh endpoint.** Ingestion runs purely on the scheduler; nothing in the API surface lets a client force a USGS fetch.
- **Implementation class is `EarthquakeServiceImplementation`** (full word, no `Impl` suffix), but its test class is `EarthquakeServiceImplTest`. Keep this in mind when grepping or using `-Dtest=`.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/earthquakes` | Paginated table query. Returns `PageResponse<EarthquakeResponseDto>`. Query params: `minMagnitude` (optional, `>=`), `categories` (zero or more `SMALL`/`MEDIUM`/`LARGE`), `from`/`to` (ISO 8601 datetimes, default last 24h), and the standard `page`/`size`/`sort` (default `size=20`, `sort=time,desc`). |
| GET | `/api/earthquakes/all` | Unpaged map query. Same filter params; returns `List<EarthquakeResponseDto>` ordered by time descending. |

## Testing

- **Controller tests**: `@WebMvcTest` with mocked service — `EarthquakeControllerTest`
- **CORS tests**: `@WebMvcTest` + `@Import(WebConfig.class)` — `WebConfigCorsTest` (parameterized over allowed origins, asserts preflight succeeds with the `Access-Control-Allow-Origin` echo)
- **Service integration tests**: extend `IntegrationTestBase` (shared static Postgres Testcontainer) — `EarthquakeServiceImplTest`
- **Repository tests**: extend `IntegrationTestBase` — `EarthquakeRepositoryTest`
- **Scheduler tests**: pure unit tests with Mockito — `EarthquakeIngestionSchedulerTest`
- **Mapper tests**: pure unit tests — `EarthquakeMapperTest`

Tests use **JUnit 5 + Mockito + AssertJ**. `IntegrationTestBase` uses the **singleton-container pattern**: a static `PostgreSQLContainer<>("postgres:16")` is started once and reused for the JVM lifetime (Testcontainers' Ryuk reaper cleans it up at exit), so multiple integration test classes don't each pay the container startup cost. Datasource properties are wired via `@DynamicPropertySource`.

## Key Configuration (`application.properties`)

```
server.port=9090
spring.datasource.url=jdbc:postgresql://localhost:5440/earthquake_db
spring.datasource.username=admin
spring.datasource.password=admin
app.usgs.url=https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson
app.usgs.min-magnitude=0.5
app.usgs.refresh-cron=0 */15 * * * *
app.retention.days=31
app.retention.cron=0 0 3 * * *
app.cors.allowed-origins=http://localhost:5173,http://localhost:5174
```
