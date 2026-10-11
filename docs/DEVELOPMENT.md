# HRM — Development Guide

## Prerequisites

| Tool        | Version | Install |
|-------------|---------|---------|
| Java JDK    | 17+     | [adoptium.net](https://adoptium.net) |
| PostgreSQL  | 14+     | [postgresql.org](https://www.postgresql.org/download/) |
| Node.js     | 18+     | [nodejs.org](https://nodejs.org) |
| Git         | Latest  | [git-scm.com](https://git-scm.com) |

## Initial Setup

### 1. Database Setup

```sql
-- Connect to PostgreSQL and create the databases
CREATE DATABASE hrm_db_employee;
CREATE DATABASE hrm_db_hr;
CREATE DATABASE hrm_db_user;
```

Tables are auto-created by Hibernate (`ddl-auto: update`) on first startup.

### 2. Environment Configuration

```bash
# Backend
cp hrm_backend/.env.example hrm_backend/.env
# Edit .env with your database credentials

# Frontend
cp hrm_frontend/.env.example hrm_frontend/.env
```

### 3. Start Backend Services

Each service runs independently. Start them in separate terminals:

```bash
# Terminal 1: Employee Service
cd hrm_backend/Employee_Backend
./gradlew bootRun

# Terminal 2: HR Service
cd hrm_backend/HR_Backend
./gradlew bootRun

# Terminal 3: User Service (Legacy)
cd hrm_backend/User_Backend
./gradlew bootRun
```

### 4. Start Frontend

```bash
cd hrm_frontend
npm install    # first time only
npm run dev
```

Open http://localhost:5173

## Project Conventions

### Backend

| Convention | Standard |
|------------|----------|
| Package naming | `com.airella.hrm.{layer}` (lowercase) |
| Dependency injection | **Constructor injection** (never `@Autowired`) |
| Logging | **SLF4J** (`Logger log = LoggerFactory.getLogger(...)`) |
| Exception handling | Custom exceptions + `GlobalExceptionHandler` |
| Read transactions | `@Transactional(readOnly = true)` |
| API responses | Always wrapped in `ApiResponse<T>` |
| Password storage | **BCrypt** via `PasswordEncoder` |

### Frontend

| Convention | Standard |
|------------|----------|
| API calls | Via `services/api.js` functions |
| Base URLs | From `import.meta.env.VITE_*` |
| Auth tokens | `localStorage.getItem("token")` |

## Common Issues

### Service won't start
- **Port already in use**: Check if another service is using the port. Change in `.env`.
- **Database not found**: Ensure PostgreSQL is running and the database exists.
- **Java version mismatch**: Run `java -version` and ensure it's 17+.

### CORS errors in browser
- Check `CORS_ALLOWED_ORIGINS` in `.env` includes your frontend URL.
- Restart the backend service after changing env vars.

### JWT token issues
- Ensure all services use the **same `JWT_SECRET`** value.
- Tokens expire after 24 hours (`JWT_EXPIRATION=86400000`).
- Clear localStorage and re-login if token is corrupted.

### Database connection refused
- Verify PostgreSQL is running: `pg_isready`
- Check credentials in `.env`
- Ensure the database exists: `psql -l`

## Useful Commands

```bash
# Build without running tests
./gradlew build -x test

# Run tests
./gradlew test

# Clean build
./gradlew clean build

# Check application health (if actuator is enabled)
curl http://localhost:5003/actuator/health

# Frontend production build
cd hrm_frontend && npm run build
```

## Adding New Features

1. **Model**: Create entity in `model/` package
2. **Repository**: Create interface in `repository/` extending `JpaRepository`
3. **DTO**: Create in `dto/` with validation annotations
4. **Service**: Create in `service/` with constructor injection and SLF4J
5. **Controller**: Create in `controller/` — no try-catch, use `ApiResponse` wrapper
6. **Update SecurityConfig** if new endpoints need specific role access
