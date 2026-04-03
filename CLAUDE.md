## Bash Commands

Safe commands are pre-approved — don't prompt for confirmation on:
- File browsing: `ls`, `cat`, `pwd`
- Git read-only: `git status`, `git log`, `git diff`, `git branch`
- Node/npm: `npm install`, `npm run *`, `npm test`, `npx *`
- Network: `curl localhost:*`, `lsof -i`
- Process: `pkill`, `kill`
- Filesystem: `mkdir -p`

Never run without explicit user approval:
- `rm -rf`, `rm -r` (destructive file deletion)
- `git push --force`, `git reset --hard`, `git checkout .` (destructive git)
- Any command that drops databases or deletes cloud resources

---

## Security

- **Never hardcode API keys** in source files, commit messages, or chat. Use `.env` files.
- **Always create `.env.example`** alongside any `.env` file so collaborators know what variables are needed (without the actual values).
- **Never commit `.env` files.** Set up `.gitignore` before the first commit — not after.
- **Verify `.gitignore` covers:** `.env`, `.env.local`, `node_modules/`, `.DS_Store`, `.next/`, `dist/`
- If a secret is accidentally committed, warn the user that it persists in git history and should be rotated.

---

## Code Quality

### Backend (NestJS)
- **Always validate request bodies** with DTO classes using `class-validator` decorators. Never use `as` type casts on user input — that bypasses all validation.
- **Handle edge cases in data mappers.** Don't default missing fields to empty strings silently. Filter out records that are missing critical fields (e.g., `id`, `name`). Log warnings for malformed data.
- **Use `import type`** for interfaces in NestJS when `isolatedModules` and `emitDecoratorMetadata` are enabled — prevents TS1272 errors.
- **Run `npm run build`** before declaring backend work complete. TypeScript compilation catches errors that `start:dev` may not surface immediately.
- **Restrict CORS** to specific origins (`http://localhost:3001`) rather than using open `app.enableCors()`.

### Frontend (Next.js)
- **Add fallback UI** for missing images (placeholder image) and invalid dates (graceful "Date TBD" text).
- **Disable submit buttons** while requests are in flight to prevent duplicate submissions.
- **Parse error responses** from the backend — don't show generic "something went wrong" when the API returns specific error details.
- **Add timeouts** to fetch calls to prevent hanging requests.
- **Next.js 16+:** `params` and `searchParams` are Promises — they must be awaited.

---

## Superpowers Workflow

Follow this order for any feature or bugfix:

1. **Brainstorming** — Use the `superpowers:brainstorming` skill before starting new features. Don't jump to code.
2. **TDD** — Use the `superpowers:test-driven-development` skill before writing implementation code. Write tests for mappers, services, and utilities first.
3. **Implementation** — Write the code.
4. **Verification** — Use the `superpowers:verification-before-completion` skill before declaring any milestone done. Run `npm run build`, run tests, test manually.
5. **Code review** — Use the `superpowers:requesting-code-review` skill after completing major features or milestones.

Do not skip steps 2 and 4. These catch the most bugs.

---

## Error Handling

- **Backend:** Distinguish error types in catch blocks. A 401 (invalid API key) should produce a different message than a 429 (rate limit) or a network timeout. Use the NestJS `Logger` service.
- **Frontend:** Parse the error response body — the backend often returns useful details. Show the user actionable messages ("City not found" vs "Server error, try again later").
- **Mappers:** Validate that required fields exist before mapping. Log and skip malformed records rather than silently producing broken data.

---

## Git Practices

- Create `.gitignore` **before** the first commit, not after.
- Run `git status` before every commit to verify what's being staged.
- Never commit secrets — even temporarily. They persist in git history forever.
- Use `.env.example` files so the repo documents what configuration is needed without exposing values.
- Prefer specific `git add <file>` over `git add .` to avoid accidentally staging sensitive files.
