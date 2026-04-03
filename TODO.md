# PartyPlace — Implementation Todo

---

## Milestone 1: AI Query Parsing (OpenAI Integration)

**Goal:** User enters a natural language query, the system calls OpenAI to extract structured search criteria, and displays the parsed filters back to the user.

### Project Setup

- [x] **`.gitignore`** — Create before first commit. Cover: `.env`, `.env.local`, `node_modules/`, `.DS_Store`, `.next/`, `dist/`, `.superpowers/`
- [x] **`backend/`** — Scaffold NestJS project with TypeScript
- [x] **`frontend/`** — Scaffold Next.js project with App Router and TypeScript
- [x] **`backend/.env`** — Store `OPENAI_API_KEY` (never commit)
- [x] **`backend/.env.example`** — Document required env vars with placeholder values
- [x] **`frontend/.env.local`** — Store `NEXT_PUBLIC_API_URL=http://localhost:3000`
- [x] **`backend/src/main.ts`** — Enable CORS restricted to `http://localhost:3001`; enable global `ValidationPipe`

### Backend — Types & DTO

- [x] **`backend/src/venue-search/types/search-criteria.ts`** — Define `SearchCriteria` interface with fields: `budget`, `guestCount`, `location`, `date`, `timeOfDay`, `occasion` (all nullable)
- [x] **`backend/src/venue-search/types/search-response.ts`** — Define `SearchResponse` interface (`venues`, `appliedFilters`, `validation`), `Venue` interface, `ValidationResult` interface (`errors[]`, `suggestedQuery`)
- [x] **`backend/src/venue-search/dto/search-query.dto.ts`** — `SearchQueryDto` with `query: string` validated via `@IsString()` `@IsNotEmpty()` from `class-validator`

### Backend — OpenAI Service

- [x] **`backend/src/venue-search/openai.service.ts`** — `parseQuery(query: string): Promise<SearchCriteria>`
  - [x] Use OpenAI API with structured outputs (response_format JSON schema)
  - [x] Use `gpt-4o-mini` model
  - [x] System prompt instructs extraction of: budget, guest count, location, date, time, occasion
  - [x] Return `null` for fields that cannot be confidently extracted
  - [x] Map occasions to known types: Birthday, Wedding, Engagement, Graduation, Anniversary, Reunion, Fundraiser, Office Party, Holiday Party, Happy hour, Bachelor/Bachelorette
  - [x] Infer `timeOfDay` from context ("dinner" → evening, "brunch" → morning)
- [x] **`backend/src/venue-search/openai.service.spec.ts`** — Tests with mocked OpenAI client
  - [x] Verify structured output schema is sent correctly
  - [x] Verify response maps to `SearchCriteria`
  - [x] Verify handles null fields / partial extraction
  - [x] Verify error handling: 401 → "AI service configuration error"
  - [x] Verify error handling: 429 → "Too many requests — please try again in a moment"
  - [x] Verify error handling: timeout → "AI service temporarily unavailable"
  - [x] Verify error handling: unparseable response → "Could not interpret your request — try rephrasing"

### Backend — Controller (Milestone 1 scope)

- [x] **`backend/src/venue-search/venue-search.controller.ts`** — `POST /api/venues/search` accepting `SearchQueryDto`
- [x] **`backend/src/venue-search/venue-search.service.ts`** — Orchestrator: calls OpenAI, builds `appliedFilters` from parsed criteria, returns response
- [x] **`backend/src/venue-search/venue-search.module.ts`** — Register all services
- [x] **`backend/src/app.module.ts`** — Import `VenueSearchModule`

### Frontend — Search UI (Milestone 1 scope)

- [x] **`frontend/types/index.ts`** — Mirror backend response types (`SearchResponse`, `Venue`, `ValidationResult`, `AppliedFilters`)
- [x] **`frontend/components/SearchBar.tsx`** — Text input + submit button; submit on Enter or click; disable button while request is in-flight
- [x] **`frontend/components/AppliedFilters.tsx`** — Display extracted filters as chips (location, guest count, occasion, date, time, budget)
- [x] **`frontend/app/page.tsx`** — Main page: search bar, loading state, display applied filters from response; fetch with 10-second timeout
- [x] **`frontend/app/globals.css`** — Base styles: clean layout, search bar styling, filter chips

### Milestone 1 Verification

- [x] `npm run build` in `backend/` — compiles cleanly
- [x] `npm test` in `backend/` — OpenAI service tests pass (9/9)
- [ ] Manual test: enter a query, see parsed filters displayed in the UI
- [ ] Manual test: empty query returns 400 error handled in UI
- [ ] Git commit milestone 1

---

## Milestone 2: Venue Matching, Validation & Results Display

**Goal:** Apply business validation rules to the parsed criteria, filter `venues.json` to find matching venues, and display results with full error handling.

### Backend — Validation Service

- [x] **`backend/src/venue-search/validation.service.ts`** — `validate(criteria: SearchCriteria, originalQuery: string): ValidationResult | null`
  - [x] Rule: Weekend bookings (Fri/Sat/Sun) require minimum budget of $1,500 (only when budget is provided)
  - [x] Rule: Events must be booked at least 3 days in advance
  - [x] Rule: Guest count must be at least 10 (only when guest count is provided)
  - [x] Return `null` if all rules pass
  - [x] On failure: return clear error messages explaining the issue
  - [x] On failure: return a suggested improved version of the query (string manipulation, not another AI call)
- [x] **`backend/src/venue-search/validation.service.spec.ts`** — Tests (write before implementation)
  - [x] Weekend + budget < $1,500 → error
  - [x] Weekend + budget >= $1,500 → no error
  - [x] Weekend + no budget provided → no error (skip rule)
  - [x] Date less than 3 days out → error
  - [x] Date exactly 3 days out → no error
  - [x] Guest count < 10 → error
  - [x] Guest count >= 10 → no error
  - [x] No guest count → no error (skip rule)
  - [x] Multiple rules fail simultaneously → multiple errors returned
  - [x] Suggested query generated for each error type

### Backend — Venue Matcher Service

- [x] **`backend/data/venues.json`** — Copy `venues.json` from project root
- [x] **`backend/src/venue-search/venue-matcher.service.ts`** — `matchVenues(criteria: SearchCriteria): Venue[]`
  - [x] Load `venues.json` into memory on module init
  - [x] Filter by `location`: case-insensitive substring match (criteria in venue or venue in criteria)
  - [x] Filter by `guestCount`: `venue.maxGuestCount >= criteria.guestCount`
  - [x] Filter by `budget`: `venue.minBudget <= criteria.budget`
  - [x] Filter by `dayOfWeek`: derive day name from `criteria.date`, check against `venue.availableDays`
  - [x] Filter by `timeOfDay`: check against `venue.openTimes`
  - [x] Filter by `occasion`: case-insensitive match against `venue.occasions`
  - [x] Skip filter for a venue when that venue's field is `null` (don't exclude, don't crash)
  - [x] Skip venues missing `id` or `name`; log warning via NestJS Logger
- [x] **`backend/src/venue-search/venue-matcher.service.spec.ts`** — Tests (write before implementation)
  - [x] Filters by location (case-insensitive substring)
  - [x] Filters by guest count
  - [x] Filters by budget
  - [x] Filters by day of week
  - [x] Filters by time of day
  - [x] Filters by occasion (case-insensitive)
  - [x] Skips filter when venue field is null (`minBudget`, `maxGuestCount`)
  - [x] Skips malformed venues (missing `id` or `name`), logs warning
  - [x] Returns all venues when no criteria provided (all fields null)
  - [x] Multiple filters narrow results correctly

### Backend — Orchestrator Update

- [x] **`backend/src/venue-search/venue-search.service.ts`** — Update orchestrator to: parse (OpenAI) → validate → if valid, match venues → build full response
- [x] **`backend/src/venue-search/venue-search.service.spec.ts`** — Integration test with mocked OpenAI: full flow returns correct `SearchResponse`

### Frontend — Results & Error Display

- [x] **`frontend/components/VenueCard.tsx`** — Card showing: name, location, max capacity, minimum budget, occasion tags, available days and times
- [x] **`frontend/components/ValidationError.tsx`** — Yellow warning box with error list + "Try this instead" suggested query; clicking suggestion populates search bar and re-submits
- [x] **`frontend/app/page.tsx`** — Update to handle all states:
  - [x] Results state: show applied filters + venue cards
  - [x] Validation error state: show applied filters + validation warning with suggested query
  - [x] No results: show applied filters + "No venues match your criteria" message
  - [x] API error: parse backend error response body, show specific message
- [x] **`frontend/app/globals.css`** — Add styles: venue cards, validation warning box, error states, responsive layout

### Milestone 2 Verification

- [x] `npm run build` in both `backend/` and `frontend/` — compile cleanly
- [x] `npm test` in `backend/` — all tests pass (validation, matcher, OpenAI, integration)
- [x] Manual test: "Birthday in SoHo for 50 people on a Friday evening with a $3000 budget" → matching venues displayed with correct filters
- [x] Manual test: query triggering validation error ("Party on Saturday May 9th 2026 for $500") → error shown with suggested query
- [ ] Manual test: click suggested query → re-searches automatically
- [x] Manual test: empty query → 400 error handled gracefully in UI
- [ ] Git commit milestone 2
