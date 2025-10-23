## Deklaro Frontend

This package contains the Next.js 14 App Router frontend for the Deklaro invoice automation platform. It is configured with Tailwind CSS v3, strict TypeScript, ESLint (flat config), and Prettier to align with the Spec Kit delivery standards.

## Prerequisites

- Node.js 18+ (use the same version across the team)
- npm 10+ (the repo uses the generated `package-lock.json`)
- A configured Supabase project with RLS policies (see `specs/001-deklaro-mvp` for details)

## Environment Variables

Copy the example file and populate it with project-specific secrets before running the app:

```bash
cp .env.example .env.local
```

Key variables include Supabase credentials, Stripe secrets, Weis API key, OpenAI key, KSeF certificate settings, and optional overrides for the Tesseract asset locations. Never commit the `.env.local` file.

## Commands

```bash
npm install           # install dependencies
npm run dev           # start dev server on http://localhost:3000
npm run build         # production build
npm run lint          # run ESLint with strict settings
npm run format        # check formatting with Prettier
npm run format:write  # auto-format files with Prettier
npm run ocr:sample    # run a CLI OCR sanity check (requires local image path)
```

## Project Structure

- `src/app/**`: App Router routes, layouts, and server components
- `src/styles/globals.css`: Tailwind base styles + design tokens
- `tailwind.config.ts`: Custom Deklaro theming, color palette, and utilities
- `lib/**`: shared utilities such as Supabase clients, OCR helpers, and tenant orchestration

## Supabase Integration

- Browser client: `src/lib/supabase/browser.ts` exposes `getBrowserSupabaseClient` with automatic token refresh handling. Import via `@/lib/supabase`.
- Server helpers: `src/lib/supabase/server.ts` provides `createServerSupabaseClient`, `getServerSession`, and route-handler variants that respect Next.js cookie APIs.
- Middleware: `middleware.ts` refreshes sessions on every request and lifts tenant context into the `x-deklaro-tenant-id` header for downstream usage.
- Tenant utilities: `src/lib/supabase/tenant.ts` centralizes how the active tenant is stored/read from cookies and headers.

## OCR Integration

- Tesseract service: `src/lib/ocr/tesseract.ts` exposes `recogniseInvoice`, `warmupOcr`, and `terminateOcr` for reuse in API routes or background jobs.
- Configuration: tweak languages or asset overrides via `NEXT_PUBLIC_TESSERACT_*` env vars (see `.env.example`).
- CLI sanity check: `npm run ocr:sample ./samples/invoice.png` executes `scripts/tools/ocr-sanity.mjs`, which is handy before wiring OCR into Supabase Edge Functions.

## Playwright Tests

- Install browser binaries once with `npx playwright install --with-deps`.
- Start the dev server manually (`npm run dev`) or set `PLAYWRIGHT_START_SERVER="npm run dev"` to auto-launch during `playwright test`.
- Execute the suite with `npm run test:e2e` (optionally override `PLAYWRIGHT_BASE_URL`).
- Specs reside in `tests/e2e/` and currently smoke-test landing, auth surfaces, and dashboard access flows.

## Next Steps

1. Implement tenant invitation endpoints and Supabase Edge Function integration.
2. Wire the dashboard views to real Supabase schema once Prisma migrations land.
3. Add Playwright coverage for auth + tenant flows, then extend coverage to OCR upload journeys.

Please keep this README updated as new tooling, scripts, or architectural decisions are introduced.



