# FX Trading App — Backend

A multi-currency foreign exchange trading API built with NestJS, TypeORM, and PostgreSQL.
Users register, verify via OTP, and then fund wallets, convert between currencies, and execute FX trades.

---

## What this is (and what it isn't)

This is a **clean, production-shaped skeleton**. The auth, wallet, FX rates, and transaction history endpoints are wired up. The `convert` and `trade` business logic is scaffolded but not yet implemented — those are the next things to build. See the checklist below.

---

## Quick start

```bash
# 1. Clone and install
git clone https://github.com/your-org/fx-trading-app.git
cd fx-trading-app
npm install

# 2. Create the database
psql -U postgres -c "CREATE DATABASE fx_trading;"

# 3. Configure environment
cp .env.example .env
# Edit .env — set your DB credentials and a real JWT_SECRET

# 4. Start dev server
npm run start:dev
```

API runs at **http://localhost:3000**
Swagger docs at **http://localhost:3000/api/docs**

---

## Key assumptions

- **One wallet row per currency per user.** There is no single "multi-currency wallet object" — the wallets table has a UNIQUE(userId, currency) constraint. `findOrCreate` is used everywhere so the wallet is lazily created on first use.
- **USD is the FX base currency.** All cross-rates are derived from USD pairs: `toRate / fromRate`. This means you only need N rates for N currencies instead of N² pairs.
- **OTP via database (not Redis) during development.** The email service is not yet implemented. To get the OTP during development, run: `SELECT code FROM otps WHERE "isUsed" = false ORDER BY "createdAt" DESC LIMIT 1;`
- **`synchronize: true` in development.** TypeORM will auto-sync the schema from entities. This is disabled when NODE_ENV=production. You must generate and run migrations before going live.
- **Balance stored as `decimal(18,4)` string.** TypeORM returns decimal columns as strings to avoid JavaScript float precision issues. Arithmetic in services uses `parseFloat()` for the skeleton — replace with `decimal.js` before production.
- **JWT is stateless, 7-day expiry.** There is no refresh token or blacklist yet. Forced logout requires adding a token version to the users table.

---

## API reference

All protected endpoints require `Authorization: Bearer <token>`.

| Method | Path            | Auth   | Description                          |
| ------ | --------------- | ------ | ------------------------------------ |
| POST   | /auth/register  | None   | Register user, trigger OTP email     |
| POST   | /auth/verify    | None   | Verify OTP → returns JWT             |
| GET    | /wallet         | Bearer | All wallet balances for current user |
| POST   | /wallet/fund    | Bearer | Top up a currency wallet             |
| POST   | /wallet/convert | Bearer | Convert between currencies (TODO)    |
| POST   | /wallet/trade   | Bearer | FX trade at market rate (TODO)       |
| GET    | /fx/rates       | Bearer | Live FX rates (stub until wired)     |
| GET    | /transactions   | Bearer | Transaction history, newest first    |

Full request/response schemas are in Swagger at `/api/docs`.

---

## Architecture decisions

### Module structure

Standard NestJS layout: module → controller → service → entity. No extra layers. Controllers are thin — they validate the request and call the service. All business logic is in services. This keeps the codebase predictable and easy to navigate.

### Why PostgreSQL, not MongoDB

Money requires ACID. The UNIQUE constraint on (userId, currency) in the wallets table is enforced at the database level — no application-level race condition can create duplicate wallet rows. Document databases would require careful application-level handling to achieve the same guarantee.

### No CQRS, no event sourcing

These patterns were excluded because the complexity cost exceeds the benefit at this scale. The service layer is already the correct seam to introduce a command bus later if needed — no structural changes required.

### FX rate design

`FxService.getRate(from, to)` derives cross-rates from USD pairs. Replace the stub `getRates()` with an HTTP call to any provider (Open Exchange Rates, Fixer.io, ExchangeRate-API) — the rest of the system works without changes.

---

## Testing with Postman

1. **Create a Collection** with a variable `token` (empty initial value)
2. Set Collection-level Authorization to `Bearer {{token}}`
3. Run requests in this order:

```
POST /auth/register      { email, password }
# Then: SELECT code FROM otps WHERE "isUsed" = false ORDER BY "createdAt" DESC LIMIT 1;
POST /auth/verify        { email, code }
# Add test script: pm.collectionVariables.set("token", pm.response.json().accessToken)
GET  /fx/rates
POST /wallet/fund        { "currency": "USD", "amount": 1000 }
GET  /wallet
GET  /transactions
```

---

## Completion checklist

### Must do next

- [ ] **Email service** — plug in any SMTP provider in `AuthService.issueOtp()`. Add `MailModule`.
- [ ] **Implement `wallet/convert`** — fetch rate from FxService, debit/credit atomically in a QueryRunner transaction, record transaction.
- [ ] **Implement `wallet/trade`** — same pattern as convert, type = TRADE.
- [ ] **Record transaction on fund** — call `transactionsService.record()` at the end of `WalletService.fund()`.
- [ ] **Login endpoint** — `POST /auth/login` with email + password → JWT. Users cannot log back in after token expiry right now.

### Production hardening

- [ ] **TypeORM migrations** — set `synchronize: false`, generate initial migration, commit it.
- [ ] **Live FX rates** — replace stub in `FxService.getRates()` with HTTP call + 60s TTL cache.
- [ ] **Rate limiting** — `@nestjs/throttler` on auth routes (5 req/min minimum).
- [ ] **Helmet** — `app.use(helmet())` in main.ts.
- [ ] **CORS** — configure `app.enableCors()` with your frontend origin, not `*`.
- [ ] **Config module** — replace raw `process.env` with `@nestjs/config` + Joi validation.
- [ ] **Consistent error shape** — `HttpExceptionFilter` returning `{ statusCode, message, timestamp, path }`.
- [ ] **Logging** — replace any `console.log` with NestJS `Logger`. Log every money movement.
- [ ] **Refresh tokens** — short-lived access tokens (15 min) + refresh tokens (30 days).

### Testing

- [ ] Unit tests for AuthService (conflict, OTP expiry, successful verify)
- [ ] Unit tests for WalletService (fund, insufficient balance)
- [ ] Unit tests for FxService (cross-rate derivation)
- [ ] E2E test for full auth → fund → get wallets flow

### Deployment

- [ ] Dockerfile + docker-compose (app + postgres)
- [ ] `GET /health` endpoint
- [ ] Secrets manager for JWT_SECRET and DB credentials
- [ ] TLS via reverse proxy (nginx or cloud load balancer)

---

## Environment variables

| Variable   | Default                 | Notes                                          |
| ---------- | ----------------------- | ---------------------------------------------- |
| DB_HOST    | localhost               |                                                |
| DB_PORT    | 5432                    |                                                |
| DB_USER    | postgres                |                                                |
| DB_PASS    | postgres                | **Change this**                                |
| DB_NAME    | fx_trading              |                                                |
| JWT_SECRET | change-me-in-production | Use 64+ random chars in any shared environment |
| NODE_ENV   | development             | `production` disables schema sync              |
| PORT       | 3000                    |                                                |

---

## Project structure

```
src/
  auth/          ← registration, OTP, JWT strategy
  users/         ← user entity + lookup service
  wallet/        ← multi-currency wallets
  transactions/  ← immutable ledger
  fx/            ← exchange rate provider
  common/
    enums/       ← Currency, TransactionType, TransactionStatus
    decorators/  ← @CurrentUser()
  main.ts
  app.module.ts
```
