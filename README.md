# FX Trading App — Backend

A multi-currency foreign exchange trading API built with NestJS, TypeORM and PostgreSQL.

Users can:

- register and verify with OTP
- fund wallets
- convert currencies
- execute FX trades

---

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/Dera2k/Fx-Trading-Backend.git
cd Fx-Trading-Backend
npm install

# 2. Create the database
psql -U postgres -c "CREATE DATABASE fx_trading;"

# 3. Set up environment variables
cp .env.example .env
# update DB config + JWT_SECRET

# 4. Start the server
npm run start:dev
```

App runs on:  
http://localhost:3000

Swagger docs:  
http://localhost:3000/api/docs

---

## Assumptions

- **One wallet per currency per user**  
  Enforced with a unique constraint. Wallets are created when first needed.

- **USD is the base currency**  
  All conversions are derived from USD pairs.

- **OTP is stored in the DB (for now)**  
  You can grab it manually during testing:

```sql
SELECT code
FROM otps
WHERE "isUsed" = false
ORDER BY "createdAt" DESC
LIMIT 1;
```

- **Auto schema sync is on (dev only)**  
  Turn this off in production and use migrations.

- **Balances use `decimal(18,4)`**  
  Stored as strings. In production - use proper decimal handling.

- **JWT expires in 7 days**  
  No refresh token yet.

---

## API reference

All protected endpoints require `Authorization: Bearer <token>`.

| Method | Path            | Auth   | Description                                 |
| ------ | --------------- | ------ | ------------------------------------------- |
| POST   | /auth/register  | None   | Register user — sends OTP to terminal (dev) |
| POST   | /auth/verify    | None   | Verify OTP → activates account + JWT        |
| POST   | /auth/login     | None   | Login with email + password → JWT           |
| GET    | /wallet         | Bearer | All wallet balances for current user        |
| POST   | /wallet/fund    | Bearer | Fund a currency wallet                      |
| POST   | /wallet/convert | Bearer | Convert between currencies at live rate     |
| POST   | /wallet/trade   | Bearer | Execute FX trade at live market rate        |
| GET    | /fx/rates       | Bearer | Current FX rates (USD base, 60s cache)      |
| GET    | /transactions   | Bearer | Transaction history, newest first           |

Full interactive docs at `http://localhost:3000/api/docs`.

---

## How it’s structured

- Controllers → handle requests
- Services → contain all logic
- Entities → map to DB

---

## Design choices

- **PostgreSQL**  
  Reliable, supports constraints and transactions - important for wallets.

- **No CQRS / event sourcing (yet)**  
  Feel its not needed as there is no frontend, but have commented its implementation in main.ts

- **FX rates**  
  Currently mocked. Replace `getRates()` in `FxService` with a real provider.

---

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/your-org/fx-trading-app.git
cd fx-trading-app
pnpm install

# 2. Create the database
psql -U postgres -c "CREATE DATABASE fx_trading;"

# 3. Configure environment
cp .env.example .env
# Edit .env — set DB credentials and JWT_SECRET

# 4. Start dev server
pnpm run start:dev
```

API runs at **[http://localhost:3000](http://localhost:3000)**
Swagger docs at **[http://localhost:3000/api/docs](http://localhost:3000/api/docs)**

---

## Key Assumptions

- **One wallet per currency per user.** Wallets table has `UNIQUE(userId, currency)`. Wallets are created on first use.
- **USD is the FX base currency.** Cross-rates are derived from USD pairs.
- **OTP stored in database** during development. To retrieve an OTP:

```sql
SELECT code FROM otps WHERE "isUsed" = false ORDER BY "createdAt" DESC LIMIT 1;
```

- **Schema auto-sync in development.** Disabled in production; use migrations instead.
- **Balance stored as `decimal(18,4)` string.** Use proper decimal handling in production.
- **JWT tokens** expire in 7 days. No refresh token implemented yet.

---

## API reference

All protected endpoints require `Authorization: Bearer <token>`.

| Method | Path            | Auth   | Description                                 |
| ------ | --------------- | ------ | ------------------------------------------- |
| POST   | /auth/register  | None   | Register user — sends OTP to terminal (dev) |
| POST   | /auth/verify    | None   | Verify OTP → activates account + JWT        |
| POST   | /auth/login     | None   | Login with email + password → JWT           |
| GET    | /wallet         | Bearer | All wallet balances for current user        |
| POST   | /wallet/fund    | Bearer | Fund a currency wallet                      |
| POST   | /wallet/convert | Bearer | Convert between currencies at live rate     |
| POST   | /wallet/trade   | Bearer | Execute FX trade at live market rate        |
| GET    | /fx/rates       | Bearer | Current FX rates (USD base, 60s cache)      |
| GET    | /transactions   | Bearer | Transaction history, newest first           |

Full interactive docs at `http://localhost:3000/api/docs`.

---

## Architecture Decisions

- **Module structure:** Standard NestJS layout - module → controller → service → entity. Controllers are thin; all business logic is in services.
- **PostgreSQL:** ACID guarantees, UNIQUE constraints, and transaction safety for wallet operations.
- **No CQRS/event sourcing:** Complexity not justified at this scale. Future improvements can introduce.
- **FX rates:** Derived from USD pairs. Replace the stub `getRates()` in `FxService` with a real API call.

---

## Testing with Postman

### One-time setup

1. Create a new Collection named `FX Trading App`
2. Inside the Collection, go to **Variables** → add variable `token` with empty value
3. Go to **Authorization** tab → Type: `Bearer Token` → Token: `{{token}}`

Every request inside the collection inherits this automatically.

### Request sequence

**1. Register**
`POST /auth/register` — no auth

```json
{ "email": "trader@example.com", "password": "Str0ngP@ss!" }
```

The OTP prints to your terminal: `[DEV ONLY] OTP for trader@example.com: 482910`

**2. Verify OTP**
`POST /auth/verify` — no auth

```json
{ "email": "trader@example.com", "code": "482910" }
```

In the **Tests** tab of this request, paste:

```javascript
pm.collectionVariables.set('token', pm.response.json().accessToken);
```

All subsequent requests now send your JWT automatically.

**3. Login** (use this after your token expires instead of re-verifying)
`POST /auth/login` — no auth

```json
{ "email": "trader@example.com", "password": "Str0ngP@ss!" }
```

Same test script as verify to refresh the token.

**4. Get FX rates**
`GET /fx/rates` — inherited Bearer token, no body

**5. Fund NGN wallet**
`POST /wallet/fund` — inherited Bearer token

```json
{ "currency": "NGN", "amount": 50000 }
```

**6. Convert NGN to USD**
`POST /wallet/convert` — inherited Bearer token

```json
{ "fromCurrency": "NGN", "toCurrency": "USD", "amount": 1000 }
```

**7. Trade NGN to GBP**
`POST /wallet/trade` — inherited Bearer token

```json
{ "fromCurrency": "NGN", "toCurrency": "GBP", "amount": 5000 }
```

**8. View all wallets**
`GET /wallet` — inherited Bearer token, no body

**9. View transaction history**
`GET /transactions` — inherited Bearer token, no body

## Project Structure

```text
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

---

## Optional Testing

- Unit tests for critical services (AuthService, WalletService, FxService)
- E2E test for full auth → fund → get wallets flow

```bash
# Run tests
pnpm run test
```

## Project Structure

```text
src/
  auth/          # auth, OTP, JWT
  users/         # user entity + service
  wallet/        # wallet logic
  transactions/  # transaction history
  fx/            # exchange rates
  common/
    enums/
    decorators/
  main.ts
  app.module.ts
```

---

## Testing

Focus on:

- AuthService
- WalletService
- FxService

```bash
npm run test
```
