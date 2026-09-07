# FlexTrip — Claude Rules

## Stack

```
fe/   Next.js 16 (App Router) · TypeScript · TailwindCSS v4 · shadcn/ui
be/   NestJS 12 · TypeScript · Prisma 7 · PostgreSQL 16 · Redis 7
```

Required Node version: **20.x** (`nvm use 20`).

---

## Project Structure

```
FlexTrip/
├── fe/src/
│   ├── app/(auth)/          # login, register
│   ├── app/(main)/          # search, listings, bookings, messages, profile
│   ├── components/          # reusable UI components
│   ├── hooks/               # custom React hooks
│   ├── lib/api/             # fetch wrapper for BE calls
│   ├── lib/validators/      # Zod schemas
│   ├── store/               # Zustand stores
│   └── types/               # shared TypeScript types
└── be/src/
    ├── modules/             # feature modules (auth, users, listings, bookings, payments, messages, notifications, contracts, search)
    ├── common/              # Guards, Interceptors, Decorators, Filters, Pipes
    ├── config/              # app config
    └── prisma/              # PrismaService (global module)
```

---

## Conventions

### General
- Language: **TypeScript strict** for both FE and BE
- File naming: `kebab-case` for files, `PascalCase` for classes/components
- Comments: never explain WHAT — only explain WHY when logic is non-obvious
- Do not add features beyond what is asked, do not over-engineer

### Frontend (fe/)
- Use **App Router** only — never Pages Router
- Server state: **TanStack Query** / Client state: **Zustand**
- Forms: **React Hook Form + Zod**
- Styling: **TailwindCSS** only — no plain CSS, no inline styles
- Components: prefer **shadcn/ui** before building custom ones
- API calls: use `src/lib/api/client.ts` — never call `fetch` or `axios` directly elsewhere
- Zod schemas go in `src/lib/validators/`
- Zustand stores go in `src/store/`, filename pattern: `*.store.ts`

### Backend (be/)
- One feature = one module in `src/modules/`
- Controllers handle request/response only — business logic belongs in Services
- Validate all input via **DTO + class-validator** — no manual validation in services
- Throw errors via NestJS exceptions (`NotFoundException`, `BadRequestException`, etc.) — do not swallow errors with `try/catch`
- Auth: JWT access token (15m) + refresh token (7d) in httpOnly cookie
- Every protected endpoint must have `@UseGuards(JwtAuthGuard)`
- Background jobs use **BullMQ** — never use `setTimeout` for async tasks
- After editing `schema.prisma`: run `npx prisma migrate dev --name <name>` and commit the migration file

---

## Use Case IDs

When writing code for a feature, reference the use case ID in branch names and PR titles (e.g. `feat/BOOK-03`):

| Module        | IDs          |
|---------------|--------------|
| Auth          | AUTH-01..06  |
| Listing       | LIST-01..05  |
| Search        | SRC-01..04   |
| Booking       | BOOK-01..09  |
| Payment       | PAY-01..06   |
| Contract      | CONTR-01..05 |
| Message       | MSG-01..03   |
| Notification  | NOTI-01..03  |
| AI Chatbot    | BOT-01..02   |
| AI Recommend  | AIREC-01..04 |
| Pricing AI    | PRICE-01..04 |

---

## Local Environment

- Start DB + cache: `docker compose up -d --force-recreate` — PostgreSQL on 5432, Redis on 6379
- BE runs on port **3001**, FE on port **3000**
- Swagger docs: `http://localhost:3001/api/docs`
- Prisma Studio: `npx prisma studio` (run inside `be/`)
- Env files: `be/.env` and `fe/.env.local` — never commit these, use `env.example` as template

---

## Do Not

- Edit `prisma/schema.prisma` without running a migration afterward
- Commit `.env` or `.env.local`
- Use `any` in TypeScript unless absolutely unavoidable
- Create migration files manually — always use `npx prisma migrate dev`
- Install a package without first checking if it already exists in the project
- Call the database directly from FE — always go through the BE API
