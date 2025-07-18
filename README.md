## Setup Instructions to Run the App Locally

1. **Clone the repository**

   ```bash
   git clone https://github.com/zh4dev/BlueHornTech-BE.git
   cd BlueHornTech-BE
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Install PostgreSQL**

   Make sure PostgreSQL is already installed on your machine and running.

   If you haven't installed it yet, you can download it from:
   https://www.postgresql.org/download/

   After installation, ensure the PostgreSQL service is running, and your local database connection (as defined in the .env) is accessible.

   ```bash
   Example connection string in .env:
   postgresql://<user>:<password>@localhost:5432/<your_database_name>
   ```

4. **Setup .env \***

   ```bash
   Create a .env, .env.dev, .env.prod file in the root directory with the following example values:

   # Database connection string
   DATABASE_URL="postgresql://gerzhahp:@localhost:5432/blue_horn_tech_dev"

   # JWT token secret key
   JWT_SECRET="Yv#8@N$w3rT!g7Ek22^qB1!sF@9uW$eMvA%rBzKxW&dTnH!p"

   # Session encryption secret
   SESSION_SECRET="!sF@9uC$eMvA%rrT1e123as!g7ZkCzDxW&dTnH!Yv#8@N$"

   # Discord webhook URL for notifications (optional)
   WEB_HOOK_DISCORD="https://discord.com/api/webhooks/..."

   # Environment type (e.g., Development, Production)
   ENV_TYPE="Development"

   # Application port
   PORT=3005
   ```

5. **Run database migrations**

   ```bash
   npx prisma migrate dev
   ```

6. **Start the development server**

   ```bash
   npm run dev
   ```

7. The API will be available at `http://localhost:3005` (or your defined port).

---

## Tech Stack & Key Decisions

- **Runtime**: Node.js
- **Language**: TypeScript
- **Framework**: Express.js
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Environment Management**: dotenv
- **Validation**: Zod
- **Dev Tools**: ESLint, Prettier

### Why this stack?

- **TypeScript** adds type safety and better refactoring.
- **Express** is lightweight and flexible for building RESTful APIs.
- **Prisma** provides clean type-safe DB access and easy migration flow.
- **PostgreSQL** is reliable for relational data.
- **Zod** is the way to validate the request

---

## Assumptions Made

- **User Role has Caregiver and Client**
  Since authentication is not required, it's assumed the app only supports caregiver and client roles. Multi-role access (e.g., admin or supervisor) is not implemented.

- **Get Started Schedule**
  This logic is used to display an active ongoing visit on the dashboard. Each caregiver is assumed to have at most one active visit at a time.

- **Get All Schedule**:
  A showToday query param is supported. If true, it returns only today's schedules; otherwise, it returns all. The response also includes a stats field containing totals for all.

- **Get Detail Schedule**:
  Integrated with nominatim.openstreetmap.org to reverse geocode latitude and longitude into readable addresses. Fetching might take slightly longer due to external API latency.

- **Schedule Status is Time-Based**
  To determines whether a visit is completed, missed, in-progress, upcoming, started based on current time and visit log values.

- **Start Visit**:

1. Location is validated to ensure the caregiver is within 100 meters of the scheduled coordinates.
2. Visits can only start within a valid window — not earlier than 15 minutes before and not after the scheduled end time.
3. A visit already marked as started (startTime exists) cannot be restarted unless cancelled first.
4. Time is validated based on server time, and errors are consistently handled.

- **End Visit**:

1. Location is again validated (within 100 meters of the scheduled point).
2. A visit must be started and not yet ended.
3. Visits shorter than 5 minutes are not allowed. Validations return clear, consistent error messages.

- **Cancel Visit**:

1. A visit cannot be cancelled if it hasn't been started (startTime is null).
2. If the visit has already been ended (endTime exists), it cannot be cancelled.

- **Create Schedule**:

1. Validates that caregiverId and clientId match the correct user roles from the database.
2. Checks for overlapping schedules on the same date to ensure a caregiver doesn't have conflicting bookings. When updating, the current schedule ID is excluded from conflict checks.

- **Edit Schedule**:
  Reuses the same logic as Create Schedule, but only the id field is required. Other fields are optional.

---

## If Given More Time, I Would...

- Add unit tests and integration tests.
- Add rate limiting and security headers (helmet, express-rate-limit).
- Add token-based authentication for login
- Add an admin role to manage data
- Integrate AWS for upload a photo
- Deployed on a VPS
