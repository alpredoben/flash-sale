# Flash Sale REST API

Build a Flash Sale Reservation System API that safely handles limited stock under high
concurrency. This app built with Express.js and TypeScript.

## 📋 Table of Contents

- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [Architecture Overview](#-architecture-overview)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Environment Variables](#-environment-variables)
- [Running the Application On Production](#-running-the-application-on-production)
- [Database Operations](#-database-operations)
- [Testing](#-testing)
- [Concurrency Strategy](#-concurrency-strategy)
- [API Documentation](#-api-documentation)
- [Project Structure](#-project-structure)
- [Known Limitations](#-known-limitations)
- [Author](#-author)

## 🚀 Features

**1. Authentication & Authorization**

- JWT-based login & register
- Roles: admin, user
- Admin: create items, view all reservations
- User: reserve items, view own reservations

**2. Items API**

- Create item (admin only)
- List items
- View item details

**3. Reservation API**

- Reserve item
- Checkout reservation
- View user reservations

**4. Stock Handling (Critical)**

- Prevent overselling
- Atomic stock decrement

**5. Expiration Scheduler**

- Runs every 1 minute
- Marks expired reservations
- Restores stock

**6. Rate Limiting**

- Limit reservation requests
- Return HTTP 429 when exceeded

## 🛠 Technology Stack

### Core Technologies

- **Runtime**: Node.js (>=18.0.0)
- **Language**: TypeScript 5.9+
- **Framework**: Express.js 5.2+
- **ORM**: TypeORM 0.3+
- **Database**: PostgreSQL 16
- **Cache**: Redis 7
- **Message Queue**: RabbitMQ 3.12

### Key Libraries

- **Authentication**: JWT (jsonwebtoken)
- **Validation**: class-validator, express-validator
- **Email**: Nodemailer with Handlebars templates
- **Logging**: Winston with daily rotate file
- **Security**: Helmet, bcrypt, hpp
- **Rate Limiting**: express-rate-limit with Redis store
- **Job Scheduling**: node-cron
- **API Documentation**: Swagger UI Express
- **Testing**: Jest, Supertest

## 🏗 Architecture Overview

### Layered Architecture

The application follows a **custom layered architecture** pattern with clear separation of concerns:

```
┌─────────────────────────────────────────────────────┐
│                   Routes Layer                       │
│          (HTTP endpoints & middleware)               │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│               Controllers Layer                      │
│        (Request handling & validation)               │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│                Services Layer                        │
│          (Business logic & orchestration)            │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│              Repositories Layer                      │
│         (Data access & persistence)                  │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│              Database (PostgreSQL)                   │
└─────────────────────────────────────────────────────┘
```

### Key Architectural Components

1. **Controllers**: Handle HTTP requests, validate inputs, and delegate to services
2. **Services**: Contain business logic, coordinate between repositories and external services
3. **Repositories**: Manage database operations using TypeORM
4. **Middlewares**: Handle cross-cutting concerns (auth, validation, logging, rate limiting)
5. **Events**: Manage asynchronous operations via RabbitMQ (email jobs, notifications)
6. **Shared**: Common utilities, constants, middlewares, and validators

### Data Flow

```
Client Request → Routes → Middleware Stack → Controller
                                                  ↓
                                              Validation
                                                  ↓
                                               Service
                                             ↙    ↓    ↘
                                    Repository  Cache  Queue
                                         ↓        ↓      ↓
                                    Database   Redis  RabbitMQ
```

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0
- **Docker**: >= 20.10.0 (for containerized setup)
- **Docker Compose**: >= 2.0.0
- **PostgreSQL**: 16+ (if running locally without Docker)
- **Redis**: 7+ (if running locally without Docker)
- **RabbitMQ**: 3.12+ (if running locally without Docker)

## 🔧 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/alpredoben/flash-sale.git
cd flash-sale
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Then edit `.env` with your configuration (see [Environment Variables](#-environment-variables) section).

### 4. Install via docker

**Option A: Using Docker Compose (Recommended)**

```bash
# Start all services (PostgreSQL, Redis, RabbitMQ)
docker compose -f docker-compose.dev.yml up -d
```

**Option B: Local Installation**

Ensure PostgreSQL, Redis, and RabbitMQ are running locally and configure the `.env` file accordingly.

## 🔐 Environment Variables

### Application Configuration

| Variable       | Description                          | Default               | Required |
| -------------- | ------------------------------------ | --------------------- | -------- |
| `APP_NAME`     | Application name                     | Flash Sales           | ✅       |
| `APP_URL`      | Application URL                      | http://localhost:3000 | ✅       |
| `API_VERSION`  | API version prefix                   | v1                    | ✅       |
| `APP_LANGUAGE` | Default language (en/id)             | en                    | ✅       |
| `NODE_ENV`     | Environment (development/production) | development           | ✅       |
| `PORT`         | Server port                          | 3000                  | ✅       |

### Database Configuration

| Variable         | Description                         | Default       | Required |
| ---------------- | ----------------------------------- | ------------- | -------- |
| `DB_HOST`        | PostgreSQL host                     | localhost     | ✅       |
| `DB_PORT`        | PostgreSQL port                     | 5966          | ✅       |
| `DB_USERNAME`    | Database username                   | admin         | ✅       |
| `DB_PASSWORD`    | Database password                   | QueenSQL      | ✅       |
| `DB_DATABASE`    | Database name                       | db_flash_sale | ✅       |
| `DB_SYNCHRONIZE` | Auto-sync schema (development only) | false         | ✅       |
| `DB_LOGGING`     | Enable query logging                | true          | ❌       |
| `DB_POOL_MIN`    | Minimum connection pool size        | 2             | ❌       |
| `DB_POOL_MAX`    | Maximum connection pool size        | 10            | ❌       |

### Redis Configuration

| Variable           | Description                 | Default    | Required |
| ------------------ | --------------------------- | ---------- | -------- |
| `REDIS_HOST`       | Redis host                  | localhost  | ✅       |
| `REDIS_PORT`       | Redis port                  | 6379       | ✅       |
| `REDIS_PASSWORD`   | Redis password              | QueenRedis | ✅       |
| `REDIS_DB`         | Redis database number       | 0          | ❌       |
| `REDIS_TTL`        | Default cache TTL (seconds) | 3600       | ❌       |
| `REDIS_KEY_PREFIX` | Key prefix for namespacing  | flashsale: | ❌       |

### RabbitMQ Configuration

| Variable            | Description       | Default      | Required |
| ------------------- | ----------------- | ------------ | -------- |
| `RABBITMQ_HOST`     | RabbitMQ host     | localhost    | ✅       |
| `RABBITMQ_PORT`     | RabbitMQ port     | 5872         | ✅       |
| `RABBITMQ_USER`     | RabbitMQ username | admin        | ✅       |
| `RABBITMQ_PASSWORD` | RabbitMQ password | QueenRMQ     | ✅       |
| `RABBITMQ_VHOST`    | Virtual host      | /            | ❌       |
| `RABBITMQ_EXCHANGE` | Exchange name     | api_exchange | ✅       |

### JWT Configuration

| Variable                 | Description              | Default | Required |
| ------------------------ | ------------------------ | ------- | -------- |
| `JWT_ACCESS_SECRET`      | Access token secret key  | -       | ✅       |
| `JWT_REFRESH_SECRET`     | Refresh token secret key | -       | ✅       |
| `JWT_ACCESS_EXPIRATION`  | Access token expiration  | 15m     | ✅       |
| `JWT_REFRESH_EXPIRATION` | Refresh token expiration | 7d      | ✅       |

### Email/SMTP Configuration

| Variable         | Description          | Default                  | Required |
| ---------------- | -------------------- | ------------------------ | -------- |
| `MAIL_HOST`      | SMTP host            | sandbox.smtp.mailtrap.io | ✅       |
| `MAIL_PORT`      | SMTP port            | 2525                     | ✅       |
| `MAIL_USER`      | SMTP username        | -                        | ✅       |
| `MAIL_PASSWORD`  | SMTP password        | -                        | ✅       |
| `MAIL_FROM`      | Sender email address | noreply@example.com      | ✅       |
| `MAIL_FROM_NAME` | Sender name          | Flash Sale API           | ✅       |

### Security Configuration

| Variable             | Description                            | Default               | Required |
| -------------------- | -------------------------------------- | --------------------- | -------- |
| `CORS_ORIGIN`        | Allowed CORS origins (comma-separated) | http://localhost:3000 | ✅       |
| `CORS_CREDENTIALS`   | Allow credentials                      | true                  | ❌       |
| `BCRYPT_SALT_ROUNDS` | Bcrypt salt rounds                     | 10                    | ✅       |
| `ENCRYPTION_KEY`     | Encryption key (32 characters)         | -                     | ✅       |
| `SESSION_SECRET`     | Session secret key                     | -                     | ✅       |

### Rate Limiting Configuration

| Variable                     | Description                      | Default | Required |
| ---------------------------- | -------------------------------- | ------- | -------- |
| `RATE_LIMIT_WINDOW_MS`       | Rate limit window (milliseconds) | 900000  | ❌       |
| `RATE_LIMIT_MAX_REQUESTS`    | Max requests per window          | 100     | ❌       |
| `RATE_LIMIT_RESERVATION_MAX` | Max reservation requests         | 10      | ❌       |

### Reservation Configuration

| Variable                     | Description                      | Default | Required |
| ---------------------------- | -------------------------------- | ------- | -------- |
| `RESERVATION_EXPIRY_MINUTES` | Reservation expiration time      | 15      | ✅       |
| `MAX_RESERVATION_PER_USER`   | Max active reservations per user | 5       | ✅       |

### Logging Configuration

| Variable     | Description                           | Default | Required |
| ------------ | ------------------------------------- | ------- | -------- |
| `LOG_LEVEL`  | Logging level (error/warn/info/debug) | info    | ✅       |
| `LOG_DIR`    | Log directory path                    | logs    | ✅       |
| `LOG_FORMAT` | Log format (json/simple)              | json    | ❌       |

### Pagination Configuration

| Variable            | Description       | Default | Required |
| ------------------- | ----------------- | ------- | -------- |
| `DEFAULT_PAGE_SIZE` | Default page size | 10      | ❌       |
| `MAX_PAGE_SIZE`     | Maximum page size | 100     | ❌       |

### Scheduler Configuration

| Variable             | Description                 | Default | Required |
| -------------------- | --------------------------- | ------- | -------- |
| `SCHEDULER_ENABLED`  | Enable scheduled jobs       | true    | ❌       |
| `SCHEDULER_INTERVAL` | Job interval (milliseconds) | 60000   | ❌       |

### Other Configuration

| Variable | Description | Default      | Required |
| -------- | ----------- | ------------ | -------- |
| `TZ`     | Timezone    | Asia/Jakarta | ❌       |

## 🚀 Running the Application On Production

### 1. Manual Setup Production Mode

```bash
# Build the application
npm run build

# Start production server
npm run start:prod
```

### 2. Docker Production Environment

```bash
# Start all services
docker compose -f docker-compose.prod.yml up -d

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Stop services
docker compose -f docker-compose.prod.yml down

# Stop and remove volumes
docker compose -f docker-compose.prod.yml down -v
```

### 3. Accessing Services

- **API**: http://localhost:3000
- **Swagger Documentation**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/health
- **PostgreSQL**: localhost:[port db]
- **Redis**: localhost:[port redis]
- **RabbitMQ Management**: http://localhost:15672 (user: [your username], pass: [your password])

## 🗄 Database Operations

### 1. Migrations

**1. Local Setup Migration**

```bash
# Generate a new migration based on entity changes
npm run migration:generate -- src/database/migration/MigrationName

# Create a blank migration
npm run migration:create -- src/database/migration/MigrationName

# Run pending migrations
npm run migration:run

# Revert the last migration
npm run migration:revert

# Show migration status
npm run migration:show
```

**2. Via docker**

```bash
# Generate a new migration based on entity changes
docker compose -f docker-compose.[dev/prod].yml exec $(your_service_app_name) npm run migration:generate -- src/database/migration/MigrationName

# Create a blank migration
docker compose -f docker-compose.[dev/prod].yml exec $(your_service_app_name) npm run migration:create -- src/database/migration/MigrationName

# Run pending migrations
docker compose -f docker-compose.[dev/prod].yml exec $(your_service_app_name) npm run migration:run

# Revert the last migration
docker compose -f docker-compose.[dev/prod].yml exec $(your_service_app_name) npm run migration:revert

# Show migration status
docker compose -f docker-compose.[dev/prod].yml exec $(your_service_app_name) npm run migration:show
```

### 2. Schema Operations

**1. Local schema operation**

```bash
# Synchronize schema (⚠️ Use only in development)
npm run schema:sync

# Drop all tables (⚠️ Destructive operation)
npm run schema:drop
```

**2. Docker schema operation**

```bash
# Synchronize schema (⚠️ Use only in development)
docker compose -f docker-compose.[dev/prod].yml exec $(your_service_app_name)  npm run schema:sync

# Drop all tables (⚠️ Destructive operation)
docker compose -f docker-compose.[dev/prod].yml exec $(your_service_app_name)  npm run schema:drop
```

### 3. Seeding

**1. Local run seeders**

```bash
npm run db:seed
```

**2. Docker run seeders**

```bash
# Synchronize schema (⚠️ Use only in development)
docker compose -f docker-compose.[dev/prod].yml exec $(your_service_app_name)  npm run db:seed
```

## 🧪 Testing

### 1. Running Tests

```bash
# Run all tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run unit tests only
npm run test:unit

# Run specific service tests
npm run test:auth
npm run test:reservation
npm run test:item
npm run test:stock

# Run tests with coverage for specific service
npm run test:auth:coverage
npm run test:reservation:coverage
```

Notes: If you want to use docker, Use command below before default test command:

```bash
docker compose -f docker-compose.[dev/prod].yml exec $(your_service_app_name) npm run test
```

### 2. Test Structure

- **Unit Tests**: `tests/unit/` - Test individual functions and services
- **Test Setup**: `tests/setup.ts` - Test configuration and mocks

## ⚡ Concurrency Strategy

The application implements multiple strategies to handle high-concurrency scenarios during flash sales:

### 1. Redis-Based Stock Management

**Atomic Operations for Stock Control**

```typescript
WATCH item:stock:{itemId}
GET item:stock:{itemId}
// Check if stock is sufficient
MULTI
DECRBY item:stock:{itemId} quantity
EXEC
```

**Benefits:**

- ✅ Prevents race conditions during simultaneous reservations
- ✅ Extremely fast read/write operations (microseconds)
- ✅ ACID-like guarantees for stock decrements
- ✅ Automatic rollback on transaction failure

### 2. Database-Level Concurrency Control

**Optimistic Locking with Version Fields**

```typescript
@Entity()
class Item {
  @VersionColumn()
  version: number; // Auto-incremented on updates
}
```

**Pessimistic Locking for Critical Operations**

```typescript
// Acquire row-level lock during updates
await repository.findOne({
  where: { id },
  lock: { mode: 'pessimistic_write' },
});
```

**Benefits:**

- ✅ Prevents lost updates
- ✅ Ensures data consistency
- ✅ Automatic conflict detection

### 3. Rate Limiting

**Multi-Tier Rate Limiting Strategy**

```typescript
// Global rate limit: 100 requests per 15 minutes
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    store: new RedisStore(),
  })
);

// Reservation-specific rate limit: 10 per 15 minutes
reservationRouter.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
  })
);
```

**Benefits:**

- ✅ Prevents API abuse
- ✅ Fair resource distribution
- ✅ Protection against bot attacks
- ✅ Redis-backed for distributed systems

### 4. Connection Pooling

**PostgreSQL Connection Pool**

```typescript
{
  type: 'postgres',
  extra: {
    min: 2,        // Minimum connections
    max: 10,       // Maximum connections
    idleTimeoutMillis: 30000
  }
}
```

**Benefits:**

- ✅ Reuses database connections
- ✅ Reduces connection overhead
- ✅ Handles connection spikes gracefully

### 5. Asynchronous Queue Processing

**RabbitMQ for Non-Critical Operations**

```typescript
// Email sending is moved to background queue
await emailPublisher.publish({
  type: 'RESERVATION_CONFIRMED',
  data: reservationData,
});
```

**Benefits:**

- ✅ Non-blocking operations
- ✅ Guaranteed message delivery
- ✅ Load balancing across workers
- ✅ Failure recovery and retry logic

### 6. Caching Strategy

**Multi-Layer Caching**

```typescript
// L1: In-memory cache (fastest, per-instance)
// L2: Redis cache (shared across instances)
// L3: Database (source of truth)

// Cache frequently accessed data
await redis.set(`item:${id}`, JSON.stringify(item), 'EX', 3600);
```

**Cache Invalidation Patterns:**

- Write-through: Update cache and database simultaneously
- Cache-aside: Update database, invalidate cache
- TTL-based: Automatic expiration after timeout

**Benefits:**

- ✅ Reduced database load
- ✅ Faster response times
- ✅ Better scalability

### 7. Reservation Expiration Handling

**Automated Cleanup via Scheduled Jobs**

```typescript
// Runs every minute to release expired reservations
cron.schedule('* * * * *', async () => {
  await releaseExpiredReservations();
});
```

**Benefits:**

- ✅ Automatic stock restoration
- ✅ Prevents stock lockup
- ✅ No manual intervention required

### Concurrency Flow Example

**Reservation Creation Process:**

```
1. Client Request → Rate Limiter Check
                         ↓
2. JWT Authentication → RBAC Permission Check
                         ↓
3. Redis: Check Stock (WATCH + GET)
                         ↓
4. Redis: Atomic Decrement (MULTI + DECRBY + EXEC)
                         ↓
5. PostgreSQL: Create Reservation (with optimistic lock)
                         ↓
6. RabbitMQ: Queue Email Notification
                         ↓
7. Response: Reservation Created
                         ↓
8. Background: Email Worker Sends Confirmation
```

### Handling Race Conditions

**Scenario: 100 users trying to reserve the last item simultaneously**

```typescript
// 1. Redis atomic check prevents overselling
const stock = await redis.decrby(`stock:${itemId}`, quantity);
if (stock < 0) {
  await redis.incrby(`stock:${itemId}`, quantity); // Rollback
  throw new Error('Out of stock');
}

// 2. Database version check ensures consistency
const item = await repository.save({
  ...itemData,
  version: item.version, // TypeORM checks if version unchanged
});
```

**Result:**

- Only 1 user successfully reserves
- 99 users receive "Out of stock" immediately
- No dirty reads or phantom reservations

## 📚 API Documentation

### 1. Interactive Documentation

Access the Swagger UI at: **http://localhost:3000/api-docs**

### 2. Main API Endpoints

#### a. Authentication

- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/forgot-password` - Request password reset
- `POST /api/v1/auth/reset-password` - Reset password
- `GET /api/v1/auth/verify-email/:token` - Verify email address

#### b. Users

- `GET /api/v1/users` - Get all users (Admin)
- `GET /api/v1/users/:id` - Get user by ID
- `PATCH /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user (Admin)
- `GET /api/v1/users/me` - Get current user profile

#### c. Roles

- `GET /api/v1/roles` - Get all roles
- `POST /api/v1/roles` - Create role (Admin)
- `GET /api/v1/roles/:id` - Get role by ID
- `PATCH /api/v1/roles/:id` - Update role (Admin)
- `DELETE /api/v1/roles/:id` - Delete role (Admin)

#### d. Permissions

- `GET /api/v1/permissions` - Get all permissions
- `POST /api/v1/permissions` - Create permission (Admin)
- `GET /api/v1/permissions/:id` - Get permission by ID
- `PATCH /api/v1/permissions/:id` - Update permission (Admin)
- `DELETE /api/v1/permissions/:id` - Delete permission (Admin)

#### e. Items

- `GET /api/v1/items` - Get all items (with pagination)
- `POST /api/v1/items` - Create item (Admin)
- `GET /api/v1/items/:id` - Get item by ID
- `PATCH /api/v1/items/:id` - Update item (Admin)
- `DELETE /api/v1/items/:id` - Delete item (Admin)
- `GET /api/v1/items/:id/stock` - Get item stock

#### f. Reservations

- `GET /api/v1/reservations` - Get all reservations
- `POST /api/v1/reservations` - Create reservation
- `GET /api/v1/reservations/:id` - Get reservation by ID
- `PATCH /api/v1/reservations/:id/confirm` - Confirm reservation
- `PATCH /api/v1/reservations/:id/cancel` - Cancel reservation
- `GET /api/v1/reservations/me` - Get my reservations

#### g. Monitoring

- `GET /health` - Health check endpoint
- `GET /api/v1/monitoring/stats` - System statistics (Admin)

## 📁 Project Structure

```
professional-rest-api/
├── src/                          # Source code
│   ├── app/                      # Application core
│   │   ├── controllers/          # Route controllers
│   │   ├── repositories/         # Data access layer
│   │   └── services/             # Business logic
│   ├── configs/                  # Configuration files
│   ├── database/                 # Database related
│   │   ├── migration/            # Database migrations
│   │   ├── models/               # TypeORM entities
│   │   └── seeders/              # Data seeders
│   ├── docs/                     # API documentation
│   │   ├── paths/                # Swagger path definitions
│   │   └── schemas/              # Swagger schemas
│   ├── events/                   # Event-driven components
│   │   ├── jobs/                 # Scheduled jobs
│   │   └── queue/                # RabbitMQ publishers/subscribers
│   ├── interfaces/               # TypeScript interfaces
│   ├── lang/                     # Internationalization
│   │   └── locales/              # Translation files
│   ├── mail/                     # Email templates
│   │   ├── layouts/              # Email layouts
│   │   └── templates/            # Handlebars templates
│   ├── routes/                   # Route definitions
│   ├── shared/                   # Shared resources
│   │   ├── constants/            # Constants & enums
│   │   ├── middlewares/          # Express middlewares
│   │   ├── utils/                # Utility functions
│   │   └── validators/           # Request validators
│   └── server.ts                 # Application entry point
├── tests/                        # Test suites
│   ├── unit/                     # Unit tests
│   ├── integration/              # Integration tests
│   └── setup.ts                  # Test configuration
├── docker/                       # Docker configurations
│   ├── Dockerfile.dev            # Development Dockerfile
│   └── Dockerfile.prod           # Production Dockerfile
├── logs/                         # Application logs (gitignored)
├── backups/                      # Database backups (gitignored)
├── uploads/                      # File uploads (gitignored)
├── .env                          # Environment variables (gitignored)
├── .env.example                  # Environment template
├── docker-compose.dev.yml        # Dev Docker Compose
├── docker-compose.prod.yml       # Production Docker Compose
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript configuration
├── jest.config.js                # Jest configuration
├── nodemon.json                  # Nodemon configuration
├── Makefile                      # Task automation
└── README.md                     # Documentation
```

## ⚠️ Known Limitations

### 1. Scalability Constraints

**Single Redis Instance**

- Current implementation uses a single Redis instance
- **Impact**: Potential single point of failure for caching and stock management
- **Recommendation**: Implement Redis Cluster or Redis Sentinel for production
- **Mitigation**: Regular backups and monitoring

**No Horizontal Scaling Strategy**

- Application is not yet optimized for multi-instance deployment
- **Impact**: Session management and cache invalidation challenges
- **Recommendation**: Implement sticky sessions or distributed session store
- **Mitigation**: Use Redis for session storage across instances

### 2. Database Limitations

**No Read Replicas**

- All read operations hit the primary database
- **Impact**: Read-heavy operations can bottleneck during peak traffic
- **Recommendation**: Configure PostgreSQL read replicas for read-heavy queries
- **Mitigation**: Aggressive caching of frequently accessed data

**Connection Pool Size**

- Limited to 10 connections by default
- **Impact**: May not handle extreme concurrent load
- **Recommendation**: Tune based on workload and server resources
- **Mitigation**: Monitor connection usage and adjust `DB_POOL_MAX`

### 3. Stock Management Edge Cases

**Redis Persistence**

- Stock data relies on Redis RDB/AOF persistence
- **Impact**: Potential data loss if Redis crashes before persistence
- **Recommendation**: Enable both RDB and AOF with appropriate intervals
- **Mitigation**: Periodic stock reconciliation with database

**Stock Synchronization**

- Manual sync required if Redis and database diverge
- **Impact**: Overselling or underselling if systems desync
- **Recommendation**: Implement automatic reconciliation job
- **Mitigation**: Regular monitoring and alerts

### 4. Rate Limiting

**IP-Based Rate Limiting**

- Current rate limiting is based on client IP
- **Impact**: Users behind NAT/proxy share rate limits
- **Recommendation**: Implement user-based rate limiting post-authentication
- **Mitigation**: Increase rate limits for known proxies

**Distributed Rate Limiting**

- Works well with Redis but no cross-region support
- **Impact**: Different limits in different regions if multi-region deployed
- **Recommendation**: Global rate limit store or API gateway
- **Mitigation**: Single-region deployment initially

### 5. Email Delivery

**Queue-Based Email System**

- Emails sent asynchronously via RabbitMQ
- **Impact**: Delayed delivery during high load or queue backlog
- **Recommendation**: Scale email workers or use dedicated email service (SendGrid, SES)
- **Mitigation**: Monitor queue depth and worker throughput

**No Email Retry Mechanism**

- Failed emails are logged but not automatically retried
- **Impact**: Critical emails (password reset, verification) may fail silently
- **Recommendation**: Implement dead letter queue with retry logic
- **Mitigation**: Manual retry for critical operations

### 6. File Handling

**No Object Storage Integration**

- File uploads stored on local filesystem
- **Impact**: Not suitable for multi-instance deployment
- **Recommendation**: Integrate with S3, Google Cloud Storage, or similar
- **Mitigation**: Shared volume mount for multiple instances (limited solution)

**No File Size Validation**

- File upload size limits rely on Express configuration only
- **Impact**: Large files can cause memory issues
- **Recommendation**: Implement chunked upload and validation middleware
- **Mitigation**: Configure reverse proxy (nginx) upload limits

### 7. Authentication & Security

**Refresh Token Storage**

- Refresh tokens stored in database without additional encryption
- **Impact**: Database breach could compromise tokens
- **Recommendation**: Encrypt refresh tokens at rest
- **Mitigation**: Short token expiration (7 days) and rotation on use

**No 2FA Support**

- Two-factor authentication not implemented
- **Impact**: Reduced account security for high-value operations
- **Recommendation**: Implement TOTP or SMS-based 2FA
- **Mitigation**: Strong password requirements and account monitoring

### 8. Monitoring & Observability

**Basic Health Checks**

- Limited to uptime and basic service availability
- **Impact**: Cannot detect performance degradation early
- **Recommendation**: Integrate APM tools (New Relic, Datadog, Prometheus)
- **Mitigation**: Enhanced logging with performance metrics

**No Distributed Tracing**

- No request tracing across services
- **Impact**: Difficult to debug issues in production
- **Recommendation**: Implement OpenTelemetry or Jaeger
- **Mitigation**: Detailed logging with correlation IDs

### 9. Testing Coverage

**Limited Integration Tests**

- Focus primarily on unit tests
- **Impact**: Integration issues may not be caught before production
- **Recommendation**: Expand integration and E2E test coverage
- **Mitigation**: Manual testing for critical flows

**No Load Testing**

- Performance under high concurrency not thoroughly tested
- **Impact**: Unknown breaking points and bottlenecks
- **Recommendation**: Implement load testing with k6, Artillery, or JMeter
- **Mitigation**: Gradual rollout with monitoring

### 10. Deployment Limitations

**No CI/CD Pipeline**

- Manual deployment process
- **Impact**: Higher risk of human error, slower releases
- **Recommendation**: Implement GitHub Actions, GitLab CI, or Jenkins
- **Mitigation**: Detailed deployment checklist and scripts

**No Blue-Green Deployment**

- Downtime required for updates
- **Impact**: Service interruption during deployments
- **Recommendation**: Implement zero-downtime deployment strategy
- **Mitigation**: Schedule deployments during low-traffic periods

### 11. Business Logic Constraints

**Fixed Reservation Expiration**

- 15-minute expiration is hardcoded (configurable via ENV)
- **Impact**: Not flexible for different item types or flash sale events
- **Recommendation**: Per-item or per-event expiration configuration
- **Mitigation**: Adjust `RESERVATION_EXPIRY_MINUTES` globally

**No Reservation Queue**

- Users get immediate "out of stock" when sold out
- **Impact**: Poor UX, no waitlist for high-demand items
- **Recommendation**: Implement reservation queue/waitlist feature
- **Mitigation**: Notify users via email when stock is replenished

**Max Reservation Limit**

- Hard limit of 5 active reservations per user
- **Impact**: Power users or bulk buyers restricted
- **Recommendation**: Tiered limits based on user role or history
- **Mitigation**: Configurable via `MAX_RESERVATION_PER_USER`

## 👨‍💻 Author

**Ruben Alpredo Tampubolon**
