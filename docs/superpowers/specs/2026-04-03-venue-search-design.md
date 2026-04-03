# AI-Powered Venue Search — Design Spec

## Context

PartyPlace needs a full-stack app where users search for event venues using natural language. The system uses OpenAI to parse queries into structured filters, validates against business rules, and matches against a local venue dataset. The priority is a solid backend (AI parsing + matching + validation) with a minimal but functional frontend.

---

## Architecture

**Monorepo** with two apps:

- `backend/` — NestJS (port 3000)
- `frontend/` — Next.js App Router (port 3001)

### Backend Module Structure

```
backend/
├── src/
│   ├── app.module.ts
│   ├── main.ts
│   └── venue-search/
│       ├── venue-search.module.ts
│       ├── venue-search.controller.ts   # POST /api/venues/search
│       ├── venue-search.service.ts      # Orchestrator: parse → validate → match
│       ├── openai.service.ts            # OpenAI structured outputs
│       ├── validation.service.ts        # Business rule checks
│       ├── venue-matcher.service.ts     # Filter venues.json
│       ├── dto/
│       │   └── search-query.dto.ts      # { query: string } with class-validator
│       └── types/
│           ├── search-criteria.ts       # Parsed AI output
│           └── search-response.ts       # API response shape
├── data/
│   └── venues.json                      # Copied from root
├── .env                                 # OPENAI_API_KEY (not committed)
├── .env.example                         # Documents required vars
└── test/
    └── ...
```

### Frontend Structure

```
frontend/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                         # Main search page
│   └── globals.css
├── components/
│   ├── SearchBar.tsx
│   ├── AppliedFilters.tsx
│   ├── VenueCard.tsx
│   └── ValidationError.tsx
├── types/
│   └── index.ts                         # Shared response types
└── .env.local                           # NEXT_PUBLIC_API_URL (not committed)
```

---

## API Contract

### `POST /api/venues/search`

**Request:**
```json
{ "query": "Birthday in Brooklyn for 50 people on May 5th" }
```

**Response (success):**
```json
{
  "venues": [
    {
      "id": 5,
      "name": "Bushwick Rooftop",
      "minBudget": 2200,
      "maxGuestCount": 70,
      "location": "Bushwick",
      "availableDays": ["Friday", "Saturday", "Sunday"],
      "openTimes": ["evening", "night"],
      "occasions": ["Birthday", "Happy hour", "Bachelor/Bachelorette"]
    }
  ],
  "appliedFilters": {
    "occasion": "Birthday",
    "guestCount": "50 guests",
    "dayOfWeek": "Tuesday (May 5, 2026)"
  },
  "validation": null
}
```

**Response (validation failure):**
```json
{
  "venues": [],
  "appliedFilters": {
    "occasion": "Birthday",
    "budget": "$500",
    "dayOfWeek": "Saturday"
  },
  "validation": {
    "errors": ["Weekend bookings require a minimum budget of $1,500"],
    "suggestedQuery": "Birthday party in Brooklyn for 50 people on Saturday with a budget of $2,000"
  }
}
```

---

## OpenAI Integration

**Model:** `gpt-4o-mini`

**Method:** Structured Outputs (response_format with JSON schema)

**Schema returned by OpenAI:**
```typescript
interface SearchCriteria {
  budget: number | null;
  guestCount: number | null;
  location: string | null;
  date: string | null;       // ISO date (YYYY-MM-DD)
  timeOfDay: string | null;  // "morning" | "afternoon" | "evening" | "night"
  occasion: string | null;
}
```

**System prompt guidance:**
- Extract venue search parameters from natural language
- Map broad locations to specific NYC neighborhoods when possible (e.g., "Brooklyn" stays as "Brooklyn" for broad matching)
- Return `null` for any field that cannot be confidently extracted
- For occasions, match to known types: Birthday, Wedding, Engagement, Graduation, Anniversary, Reunion, Fundraiser, Office Party, Holiday Party, Happy hour, Bachelor/Bachelorette
- Infer timeOfDay from context clues ("dinner" → evening, "brunch" → morning)

---

## Venue Matching Logic

Load `venues.json` into memory once at module initialization.

**Filter chain** (each non-null criterion narrows results):

| Criterion | Match Logic |
|-----------|-------------|
| `location` | Case-insensitive: check if `criteria.location` is a substring of `venue.location` OR vice versa. Example: "Brooklyn" won't match "Williamsburg" — the AI should return the specific neighborhood if mentioned. Broad borough names match only if a venue's location field contains that word. |
| `guestCount` | `venue.maxGuestCount >= criteria.guestCount` (skip if venue.maxGuestCount is null) |
| `budget` | `venue.minBudget <= criteria.budget` (skip if venue.minBudget is null) |
| `dayOfWeek` | Derived from `criteria.date` using JS Date. Check if day name is in `venue.availableDays`. |
| `timeOfDay` | Check if `criteria.timeOfDay` is in `venue.openTimes`. |
| `occasion` | Case-insensitive match against `venue.occasions` array. |

**Null handling in venue data:** If a venue has `null` for `minBudget` or `maxGuestCount`, skip that specific filter for that venue (don't exclude it, don't crash).

**Malformed data:** Skip venues missing `id` or `name`. Log a warning with the NestJS Logger.

---

## Validation Rules

Run before venue matching. If any rule fails, return errors + a suggested improved query (generated by the validation service, not by calling OpenAI again).

| Rule | Condition | Error Message |
|------|-----------|---------------|
| Weekend minimum budget | `dayOfWeek` is Friday/Saturday/Sunday AND `budget` is provided AND `budget` < 1500 | "Weekend bookings require a minimum budget of $1,500" |
| Advance booking | `date` is less than 3 days from today | "Events must be booked at least 3 days in advance" |
| Guest minimum | `guestCount` is provided AND < 10 | "A minimum of 10 guests is required for venue bookings" |

**Suggested query generation:** Build a corrected version of the original query by appending/modifying the failing constraint. This is string manipulation, not another AI call.

---

## Frontend Design

**Single page** (`app/page.tsx`) with three states:

1. **Empty state** — Search bar with placeholder text, no results
2. **Results state** — Applied filter chips + venue cards
3. **Validation error state** — Warning box with errors + suggested query (clickable to re-search)
4. **Loading state** — Disabled search button, spinner or loading text

### Components

- **SearchBar** — Text input + submit button. Disabled while request is in-flight. Submits on Enter or click.
- **AppliedFilters** — Row of chips showing extracted filters (e.g., "📍 Brooklyn", "👥 50 guests", "🎂 Birthday")
- **VenueCard** — Card displaying: name, location, capacity, minimum budget, supported occasions as tags, available days and times
- **ValidationError** — Yellow warning box with error list + "Try this instead" box with suggested query. Clicking the suggestion populates the search bar and auto-submits.

### Error States

- **API unreachable / timeout (10s):** "Unable to reach the server. Please try again."
- **OpenAI error (passed through from backend):** Show the specific message from the backend response body
- **No results:** Show applied filters + "No venues match your criteria. Try broadening your search."

### Styling

- CSS Modules (no external UI library needed for this scope)
- Responsive single-column layout
- Clean card-based design

---

## Error Handling

### Backend

| Error Source | Status Code | User-Facing Message |
|-------------|-------------|---------------------|
| OpenAI 401 (bad key) | 502 | "AI service configuration error" |
| OpenAI 429 (rate limit) | 429 | "Too many requests — please try again in a moment" |
| OpenAI timeout/network | 502 | "AI service temporarily unavailable" |
| Invalid/empty query | 400 | "Please enter a search query" |
| OpenAI returns unparseable result | 502 | "Could not interpret your request — try rephrasing" |

Use NestJS `Logger` service for all error logging. Include the original error details in logs but not in responses.

### Frontend

- Parse response body for error details — don't show generic messages when the backend provides specifics
- 10-second timeout on fetch calls
- Disable submit button during request to prevent duplicate submissions

---

## Testing Strategy

Priority tests (TDD — write before implementation):

1. **VenueMatcherService** — unit tests for each filter criterion, null handling, malformed data skipping
2. **ValidationService** — unit tests for each business rule, edge cases (exactly 3 days out, exactly $1500 budget)
3. **SearchQuery DTO** — validation rejects empty/missing query
4. **OpenAI response mapping** — handles null fields, partial extraction

Integration test:
- Full search flow with mocked OpenAI response → verify correct venues returned

---

## Verification Plan

1. `npm run build` in both `backend/` and `frontend/` — must compile cleanly
2. `npm test` in `backend/` — all unit tests pass
3. Manual test: start both servers, enter "Birthday in Brooklyn for 50 people on May 5th", verify results display with correct filters
4. Manual test: enter a query that triggers validation (e.g., "Party on Saturday for $500"), verify error + suggestion shown
5. Manual test: enter an empty query, verify 400 error handled gracefully in UI

---

## Configuration

### `.env` (backend)
```
OPENAI_API_KEY=sk-proj-...
```

### `.env.example` (backend)
```
OPENAI_API_KEY=your-openai-api-key-here
```

### `.env.local` (frontend)
```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### `.gitignore` (root)
```
.env
.env.local
node_modules/
.DS_Store
.next/
dist/
.superpowers/
```
