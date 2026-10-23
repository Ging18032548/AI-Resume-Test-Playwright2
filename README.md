# AI Resume Playwright E2E

This repository contains the Playwright automation suite for the AI Resume website. The website and API must be running separately; this repository contains test code, not the application server.

## Setup

```powershell
npm ci
npx playwright install
Copy-Item .env.example .env
```

Set `BASE_URL` in `.env` to the running website URL. Set `TEST_EMAIL` and `TEST_PASSWORD` to an existing QA account for tests that need authentication. `API_BASE_URL` is reserved for API checks.

Browser tests use Playwright API mocking by default (`MOCK_API=true`). Requests to
authentication, profile, resume, analysis, job, and password-reset write endpoints
are fulfilled inside the browser and are not sent to the backend. Set
`MOCK_API=false` only when intentionally running against an isolated QA backend
and database; never use the developer or production database.

## Run tests

```powershell
npm test                                      # all configured browsers/devices
npm run test:chrome                           # Desktop Chrome
npm run test:firefox                          # Desktop Firefox
npm run test:mobile-chrome                    # Pixel 5
npm run test:mobile-safari                    # iPhone 14 Pro
npm run test:auth                             # registration flow and auth edge cases
npm run test:upload                            # resume upload validation
npm run test:analysis                          # resume analysis
npm run test:profile                           # profile and settings
npm run test:navigation                        # navigation and session
npm run test:protected-pages                   # functional checks for every protected page
npm run test:password-reset                    # forgot-password validation and request flow
npm run test:critical                          # complete real-user journey on Desktop Chrome
npm run test:full-system                       # register, upload, analyze, navigate, and logout
npm run test:features                          # authentication, routes, navigation, and logout on all devices
npm run test:jobs                              # dedicated /jobs (job description) coverage
npm run test:extended                          # all extended scenarios
npx playwright test tests/full-system.spec.ts --project="Desktop Chrome" # click register from sign-in and check all protected pages
npm run report                                # open latest HTML report
```

The suite covers app availability, authentication validation, registration/login, protected page rendering, protected navigation, profile settings and persistence, password reset validation, resume upload validation, analysis results, result persistence after reload, logout protection, mobile UI, and the /jobs page (list, empty state, create, edit, delete, validation, API failure, auth guard). Tests requiring a pre-existing account need valid `TEST_EMAIL` and `TEST_PASSWORD` values. The new-member upload and full-system flows require `REGISTRATION_NAME`, `REGISTRATION_EMAIL`, and `REGISTRATION_PASSWORD`; the test derives a unique email using plus-addressing from `REGISTRATION_EMAIL`, so the configured domain must accept plus-addresses. Authenticated tests are skipped with a clear reason when credentials are not configured.

### Jobs page tests

`tests/jobs.spec.ts` exercises the /jobs page end-to-end on top of the stateful mock (`fixtures/mockApi.ts` now implements GET/POST/PUT/DELETE for `/jobs` and `/job-descriptions`, plus `JOB_MATCH` analysis responses with `jobMatchScore`).

If any selector in `pages/JobsPage.ts` does not match the real DOM (the /jobs page is behind login), re-capture the actual selectors with:

```powershell
npx playwright codegen <BASE_URL>/jobs
```

A continuous-integration workflow is provided at `.github/workflows/e2e.yml` (Desktop Chrome on push/PR; set the `BASE_URL` repository secret to test a deployed environment).

## Project layout

- `playwright.config.ts`: browser/device projects and reporting
- `pages/`: page objects for authentication, dashboard, upload, analysis, jobs, and settings
- `tests/`: smoke, registration, dashboard, upload, analysis, jobs, and extended browser scenarios
- `utils/testData.ts`: environment values and test data helpers
- `utils/testFiles.ts`: generated PDF and invalid upload fixtures
