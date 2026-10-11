# HRM — Architecture Guide

## Service Architecture

The HRM system follows a **microservices architecture** with three backend services and a React frontend:

```mermaid
graph LR
    subgraph "Client Layer"
        Browser[Web Browser]
    end
    
    subgraph "Frontend"
        FE["React 19 SPA<br/>(Vite, Port 5173)"]
    end
    
    subgraph "API Gateway Layer"
        direction TB
        US["User Service<br/>(Port 5002, Legacy)"]
        ES["Employee Service<br/>(Port 5003)"]
        HS["HR Service<br/>(Port 5004)"]
    end
    
    subgraph "Data Layer"
        DB1[("hrm_db_user<br/>(Legacy)")]
        DB2[("hrm_db_employee")]
        DB3[("hrm_db_hr")]
    end
    
    Browser --> FE
    FE -- "Auth" --> US
    FE -- "Employee Ops" --> ES
    FE -- "HR/Admin Ops" --> HS
    US -. "Sync" .-> ES
    
    US --> DB1
    ES --> DB2
    HS --> DB3
```

## Service Responsibilities

### Employee Service (Port 5003)
The **primary service** handling:
- Employee self-service (profile, attendance, leave)
- Authentication & JWT token generation
- Attendance clock-in/out (manual + GPS)
- Leave application & cancellation
- Sync endpoint for receiving data from User Service

### HR Service (Port 5004)
Handles HR manager and admin operations:
- Employee CRUD (create, update, deactivate, terminate)
- Attendance oversight & adjustment approvals
- Leave approvals & rejections
- Company management (admin)
- Dashboard statistics
- Audit logging

### User Service (Port 5002) — Legacy
> ⚠️ **Deprecated** — This service handles initial registration and syncs data to the Employee Service.

## Database Schema

```mermaid
erDiagram
    COMPANIES ||--o{ DEPARTMENTS : has
    COMPANIES ||--o{ EMPLOYEES : employs
    DEPARTMENTS ||--o{ EMPLOYEES : contains
    EMPLOYEES ||--o{ ATTENDANCE : records
    EMPLOYEES ||--o{ LEAVE_APPLICATIONS : submits
    EMPLOYEES ||--o{ LEAVE_BALANCES : has
    EMPLOYEES ||--o| SALARIES : has
    EMPLOYEES ||--o{ PAYSLIPS : receives
    EMPLOYEES ||--o{ NOTIFICATIONS : receives
    EMPLOYEES ||--o{ AUDIT_LOGS : creates
    LEAVE_TYPES ||--o{ LEAVE_APPLICATIONS : categorizes
    LEAVE_TYPES ||--o{ LEAVE_BALANCES : defines

    COMPANIES {
        bigint id PK
        varchar company_name UK
        varchar registration_number UK
        varchar status
    }
    
    EMPLOYEES {
        bigint id PK
        varchar employee_id UK
        varchar email UK
        varchar password
        varchar role
        bigint company_id FK
        bigint department_id FK
    }
    
    ATTENDANCE {
        bigint id PK
        bigint employee_id FK
        date date
        time clock_in_time
        time clock_out_time
        varchar status
    }
    
    LEAVE_APPLICATIONS {
        bigint id PK
        bigint employee_id FK
        bigint leave_type_id FK
        date start_date
        date end_date
        varchar status
    }
```

## Authentication Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant US as User Service
    participant ES as Employee Service
    
    C->>US: POST /api/auth/login {email, password}
    US->>US: Validate credentials
    US->>US: Generate JWT token
    US-->>C: {token, role, id}
    
    Note over C: Store token in localStorage
    
    C->>ES: GET /api/employee/profile<br/>Authorization: Bearer <token>
    ES->>ES: Validate JWT
    ES->>ES: Extract email & role
    ES-->>C: Employee profile data
```

## Security

- **JWT tokens** contain email, role, and expiration
- **BCrypt** password hashing
- **Role-based access control** (RBAC): ADMIN > HR_MANAGER > EMPLOYEE
- **CORS** configured per environment (no wildcards in production)
- **Stateless sessions** — no server-side session storage

## Key Design Decisions

1. **Package naming**: `com.airella.hrm.{config,controller,dto,model,repository,service,exception}` (lowercase, Java convention)
2. **Constructor injection** throughout — no `@Autowired` field injection
3. **Global exception handler** (`@RestControllerAdvice`) — controllers never use try-catch
4. **SLF4J logging** — no `System.out.println`
5. **`@Transactional(readOnly = true)`** on read operations for performance
6. **`@JsonIgnore`** on bidirectional relationships to prevent infinite recursion
7. **`@ToString.Exclude`** on lazy-loaded fields to prevent `LazyInitializationException`
