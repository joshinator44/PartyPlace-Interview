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

- [ ] **`backend/src/venue-search/validation.service.ts`** — `validate(criteria: SearchCriteria, originalQuery: string): ValidationResult | null`
  - [ ] Rule: Weekend bookings (Fri/Sat/Sun) require minimum budget of $1,500 (only when budget is provided)
  - [ ] Rule: Events must be booked at least 3 days in advance
  - [ ] Rule: Guest count must be at least 10 (only when guest count is provided)
  - [ ] Return `null` if all rules pass
  - [ ] On failure: return clear error messages explaining the issue
  - [ ] On failure: return a suggested improved version of the query (string manipulation, not another AI call)
- [ ] **`backend/src/venue-search/validation.service.spec.ts`** — Tests (write before implementation)
  - [ ] Weekend + budget < $1,500 → error
  - [ ] Weekend + budget >= $1,500 → no error
  - [ ] Weekend + no budget provided → no error (skip rule)
  - [ ] Date less than 3 days out → error
  - [ ] Date exactly 3 days out → no error
  - [ ] Guest count < 10 → error
  - [ ] Guest count >= 10 → no error
  - [ ] No guest count → no error (skip rule)
  - [ ] Multiple rules fail simultaneously → multiple errors returned
  - [ ] Suggested query generated for each error type

### Backend — Venue Matcher Service

- [ ] **`backend/data/venues.json`** — Copy `venues.json` from project root
- [ ] **`backend/src/venue-search/venue-matcher.service.ts`** — `matchVenues(criteria: SearchCriteria): Venue[]`
  - [ ] Load `venues.json` into memory on module init
  - [ ] Filter by `location`: case-insensitive substring match (criteria in venue or venue in criteria)
  - [ ] Filter by `guestCount`: `venue.maxGuestCount >= criteria.guestCount`
  - [ ] Filter by `budget`: `venue.minBudget <= criteria.budget`
  - [ ] Filter by `dayOfWeek`: derive day name from `criteria.date`, check against `venue.availableDays`
  - [ ] Filter by `timeOfDay`: check against `venue.openTimes`
  - [ ] Filter by `occasion`: case-insensitive match against `venue.occasions`
  - [ ] Skip filter for a venue when that venue's field is `null` (don't exclude, don't crash)
  - [ ] Skip venues missing `id` or `name`; log warning via NestJS Logger
- [ ] **`backend/src/venue-search/venue-matcher.service.spec.ts`** — Tests (write before implementation)
  - [ ] Filters by location (case-insensitive substring)
  - [ ] Filters by guest count
  - [ ] Filters by budget
  - [ ] Filters by day of week
  - [ ] Filters by time of day
  - [ ] Filters by occasion (case-insensitive)
  - [ ] Skips filter when venue field is null (`minBudget`, `maxGuestCount`)
  - [ ] Skips malformed venues (missing `id` or `name`), logs warning
  - [ ] Returns all venues when no criteria provided (all fields null)
  - [ ] Multiple filters narrow results correctly

### Backend — Orchestrator Update

- [ ] **`backend/src/venue-search/venue-search.service.ts`** — Update orchestrator to: parse (OpenAI) → validate → if valid, match venues → build full response
- [ ] **`backend/src/venue-search/venue-search.service.spec.ts`** — Integration test with mocked OpenAI: full flow returns correct `SearchResponse`

### Frontend — Results & Error Display

- [ ] **`frontend/components/VenueCard.tsx`** — Card showing: name, location, max capacity, minimum budget, occasion tags, available days and times
- [ ] **`frontend/components/ValidationError.tsx`** — Yellow warning box with error list + "Try this instead" suggested query; clicking suggestion populates search bar and re-submits
- [ ] **`frontend/app/page.tsx`** — Update to handle all states:
  - [ ] Results state: show applied filters + venue cards
  - [ ] Validation error state: show applied filters + validation warning with suggested query
  - [ ] No results: show applied filters + "No venues match your criteria" message
  - [ ] API error: parse backend error response body, show specific message
- [ ] **`frontend/app/globals.css`** — Add styles: venue cards, validation warning box, error states, responsive layout

### Milestone 2 Verification

- [ ] `npm run build` in both `backend/` and `frontend/` — compile cleanly
- [ ] `npm test` in `backend/` — all tests pass (validation, matcher, OpenAI, integration)
- [ ] Manual test: "Birthday in Brooklyn for 50 people on May 5th" → matching venues displayed with correct filters
- [ ] Manual test: query triggering validation error (e.g., "Party on Saturday for $500") → error shown with suggested query
- [ ] Manual test: click suggested query → re-searches automatically
- [ ] Manual test: empty query → 400 error handled gracefully in UI
- [ ] Git commit milestone 2
