# Earthquake System

A full-stack web application for visualising and managing earthquake data. The backend exposes a REST API built with Spring Boot (Java), and the frontend is a TypeScript single-page application that consumes it. The project follows a standard client/server monorepo structure with separate `backend/` and `frontend/` directories.

---

## Tech Stack

**Backend**

- Java (Spring Boot, Maven)

**Frontend**

- TypeScript
- CSS (custom stylesheets, no CSS framework confirmed)

---

## Prerequisites

- Java 17 or later
- Maven 3.8 or later
- Node.js 18 or later and a compatible package manager (npm, yarn, or pnpm)
- An IDE such as IntelliJ IDEA or VS Code (both are configured in the project's `.gitignore`)

---

## Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/AndrejRistovski/earthquake_system.git
cd earthquake_system
```

### 2. Configure the backend

The backend reads sensitive configuration from a file that is excluded from version control. Create the file at:

```
backend/earthquake_backend/application-local.properties
```

Populate it with your local database credentials and any other environment-specific settings:

```properties
# Example — adjust to your environment
spring.datasource.url=jdbc:postgresql://localhost:5432/earthquake_db
spring.datasource.username=your_username
spring.datasource.password=your_password
```

If the project also uses `application-secret.properties`, place any secret keys (API keys, JWT secrets, etc.) there. Both files are listed in `.gitignore` and should never be committed.

### 3. Configure the frontend

The frontend uses environment variables loaded from a `.env` file (excluded from version control). Create:

```
frontend/earthquake_frontend/.env
```

At minimum you will need to point the frontend at the running backend:

```env
# Example — adjust port if the backend runs on a different port
VITE_API_BASE_URL=http://localhost:8080
```

### 4. Install frontend dependencies

```bash
cd frontend/earthquake_frontend
npm install      # or: yarn install / pnpm install
```

---

## How to Run

### Backend (development)

```bash
cd backend/earthquake_backend
./mvnw spring-boot:run
```

The API will be available at `http://localhost:8080` by default.

### Frontend (development)

```bash
cd frontend/earthquake_frontend
npm run dev      # or: yarn dev / pnpm dev
```

The development server will be available at `http://localhost:5173` (Vite default) or the port configured in your environment.

### Production build

**Backend:**

```bash
cd backend/earthquake_backend
./mvnw clean package -DskipTests
java -jar target/*.jar
```

**Frontend:**

```bash
cd frontend/earthquake_frontend
npm run build    # output written to dist/
```

Serve the `dist/` directory with any static file server or configure the Spring Boot app to serve it.

---

## Project Structure

```
earthquake_system/
├── backend/
│   └── earthquake_backend/         # Spring Boot application (Maven)
│       ├── src/
│       │   ├── main/
│       │   │   ├── java/           # Application source (controllers, services, repositories, models)
│       │   │   └── resources/      # application.properties and static resources
│       │   └── test/               # Unit and integration tests
│       └── pom.xml
├── frontend/
│   └── earthquake_frontend/        # TypeScript SPA
│       ├── src/                    # Components, pages, API client, utilities
│       ├── public/
│       └── package.json
└── .gitignore
```

---

## Key Features

- Listing and browsing earthquake events with associated metadata (location, magnitude, depth, timestamp)
- REST API backend providing structured access to earthquake data
- Responsive frontend interface for visualising seismic events

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/earthquakes` | Retrieve a list of earthquake events |
| `GET` | `/api/earthquakes/{id}` | Retrieve a single earthquake event by ID |
| `POST` | `/api/earthquakes` | Create a new earthquake record |
| `PUT` | `/api/earthquakes/{id}` | Update an existing earthquake record |
| `DELETE` | `/api/earthquakes/{id}` | Delete an earthquake record |

---

## Configuration

### Backend

| File | Purpose |
|------|---------|
| `src/main/resources/application.properties` | Base configuration (datasource driver, JPA settings, server port) |
| `application-local.properties` | Local overrides — **not committed** |
| `application-secret.properties` | Secrets (API keys, credentials) — **not committed** |


### Frontend

| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` | Base URL of the backend REST API |

---

## Contributing

1. Fork the repository and create a feature branch from `main`.
2. Follow the existing code style and naming conventions.
3. Keep commits focused; write a descriptive commit message.
4. Open a pull request against `main` with a summary of the change.
