# 1. Setup Instructions

  ### A. Manual Setup
  - Clone project repository
    ```cli
      git clone https://github.com/alpredoben/flash-sale.git
    ```

  - Install dependencies
    ```cli
      npm install
    ```

  - Copy env.example to your.env file
    ```cli
      cp .env.example .env
    ```

  - Set environment properties value
    ```cli
      # Application
      APP_NAME=[Your app name]
      APP_URL=http://localhost:[your port]

      # Setting
      NODE_ENV=[your environment name (development/production)]
      PORT=[your port]

      # Database
      DB_HOST=[your database host]
      DB_PORT=[your database port]
      DB_USERNAME=[your database username]
      DB_PASSWORD=[your database password]
      DB_DATABASE=[your database name]
      DB_SYNCHRONIZE=[database synchronize value (false/true)]
      DB_LOGGING=[database logging value (false/true)]
      DB_POOL_MIN=[database pool min value]
      DB_POOL_MAX=[database pool max value]

      # Redis
      REDIS_HOST=[your redis host value]
      REDIS_PORT=[your redis port value]
      REDIS_PASSWORD=[your redis password value]
      REDIS_DB=[your redis db key value]
      REDIS_TTL=[your redis ttl value]
      REDIS_KEY_PREFIX=[your redis prefix name value]

      # RabbitMQ
      RABBITMQ_HOST=[your rabbitmq host value]
      RABBITMQ_PORT=[your rabbitmq port value]
      RABBITMQ_USER=[your rabbitmq user value]
      RABBITMQ_PASSWORD=[your rabbitmq password value]
      RABBITMQ_VHOST=/
      RABBITMQ_EXCHANGE=[your rabbitmq exchange name value]

      # JWT
      JWT_ACCESS_SECRET=your-super-secret-access-token-key-change-in-environment-type
      JWT_REFRESH_SECRET=your-super-secret-refresh-token-key-change-in-environment-type
      JWT_ACCESS_EXPIRATION=15m // your access expiration time
      JWT_REFRESH_EXPIRATION=7d // your refresh expiration time

      # Email/SMTP
      MAIL_HOST=[your smtp mail host]
      MAIL_PORT=[your smtp mail port]
      MAIL_USER=[your smtp mail user]
      MAIL_PASSWORD=[your smtp mail password]
      MAIL_FROM=noreply@example.com
      MAIL_FROM_NAME=Flash Sale API

      # CORS
      CORS_ORIGIN=http://localhost:3000,http://localhost:3001
      CORS_CREDENTIALS=true

      # Encryption
      BCRYPT_SALT_ROUNDS=10 //value salt rounded
      ENCRYPTION_KEY=your-32-char-encryption-key-here

      #Rate Limiting
      RATE_LIMIT_WINDOW_MS=900000
      RATE_LIMIT_MAX_REQUESTS=100
      RATE_LIMIT_RESERVATION_MAX=10

      # Reservation
      RESERVATION_EXPIRY_MINUTES=15
      MAX_RESERVATION_PER_USER=5

      # Logging
      LOG_LEVEL=info
      LOG_DIR=logs
      LOG_FORMAT=json

      # Pagination
      DEFAULT_PAGE_SIZE=10
      MAX_PAGE_SIZE=100

      # Scheduler
      SCHEDULER_ENABLED=true
      SCHEDULER_INTERVAL=60000

      TZ=Asia/Jakarta // Timezone

      # Session
      SESSION_SECRET=your-session-secret-key-change-in-production
    ```

  - Run Migration
    To run all migration using command cli as below :
    ```cli
      npm run migration:run
    ```
    To remove all migration using command cli as below:
    ```cli
      npm run schema:drop
    ```
    To create new migration, please run command cli as below :
    ```cli
      npm run migration:create -d src/database/migrations/[YourTableName]
    ```
  - Run Seeder
    ```cli
      npm run db:seed
    ```
  - Run Application (Development mode)
    ```cli
      npm run dev
    ```

### b. Setup Via Docker
  - Run on development mode
    ```cli
      make dev-build
    ```

  - Run Migration
    ```cli
      make db-migrate
    ```

  - Run Seeder
    ```cli
      make db-seed
    ```

# 2. Environment Variables

# 3. Architecture Overview

# 4. Concurrency Strategy

# 5. Known Limitation
