# AI-summary recovery and validation

## Scope

Recovery of the useful AI-summary feature from `frontend` onto current `main`, not a wholesale merge of divergent UI history. Includes adjacent authorization fixes required to avoid exposing room content, issuing unauthorized LiveKit tokens, or sending unauthenticated invitations. No production credentials, production data, repository visibility or deployments are changed by this patch.

### Key corrections

- Persist the actual completed server stream, not a stale client state or an assumed success.
- Reject incomplete/oversized/expired/replayed/stale saves. Failed attempts consume quota.
- Atomic `summaryRuns` reservation ledger combines budget checks and run lifecycle. Chosen instead of a separate rate-limit component to keep reservation and persistence state in one Convex transaction. Global index contention is a scaling tradeoff; this is intentionally a small deployment, not a large SaaS billing system.
- Clerk subject authentication is checked at the API and database boundaries. Room identifiers and client-supplied user IDs alone do not authorize access.
- Room codes are omitted from browse responses; accepted grants authorize private joins. LiveKit tokens are short-lived and tied to the verified subject.
- Invitation recipient must use the matching verified identity email. Provider delivery errors must not produce a success notification. Email transport acceptance is not proof of inbox delivery.
- Resolved dependency incompatibilities, TypeScript/build issues and broken test setup. One npm lockfile replaces the stale parallel Bun lockfile.

## Validation snapshot — 2026-10-04

- Clean `npm ci --ignore-scripts`: passed with the committed-lockfile candidate.
- TypeScript: passed. Vitest: **41 tests, 7 files passed**.
- ESLint: passed with **24 warnings**, no errors; warnings are not represented as resolved.
- Production build: passed using synthetic public Clerk/Convex identifiers, AI disabled.
- Production dependency audit: zero findings. Full audit limitation below remains open.
- A keyless local Convex startup was attempted in the isolated clone, but backend binary download did not finish within five minutes and was stopped. A fresh 100-second retry also remained at binary download; only that validation process was stopped. Standalone `convex codegen --typecheck enable` requires a configured deployment and could not run. **Live backend validation and CLI code generation are not confirmed.** The API type declaration includes the summary module; regenerate it against the chosen development deployment before release.
- No actual OpenAI, Resend, Clerk or LiveKit integration session was exercised; no production deployment or data changes.

## Automated checks

The test suite covers owner/service authentication, identity spoofing, room history permissions, private join grants, source and output bounds, quotas, final-result persistence, failed saves, consent, incomplete streams, cancellation UI, anonymous/unauthorized LiveKit issuance, verified JWT claims and invitation delivery errors.

- `convex-test` is an in-memory harness: it is not a real Clerk token or proof of deployed Convex transaction behavior under load.
- HTTP provider tests use mocks; LiveKit token tests sign local test tokens without connecting to LiveKit.
- UI tests render actual dialog/button components in jsdom, not a fully authenticated end-to-end browser session.
- Build-only service identifiers prove compilation, not a working account or demo.

### Dependency audit limitation

On 2026-10-04, production dependency audit reported **zero vulnerabilities**. Full audit retained five high-severity dependency entries in the **development-only Next ESLint -> fast-glob -> micromatch -> braces** chain (one underlying advisory, GHSA-vfj7-8cjw-p6xm). Registry inspection reported braces 3.0.3 as latest and no patched compatible version. These are not five distinct exploited defects.

Do not claim a clean full audit. Do not run the affected tooling on untrusted/adversarial patterns; reassess before external CI contributions. Keep Next lint checks instead of silently replacing/removing them solely to conceal an advisory. Track the upstream patch and refresh the lockfile when available. Production audit is a release check but is not a complete security audit.

## Required real-service validation (not yet completed)

- [ ] Confirm the selected development Clerk issuer/template, Convex deployment and existing `clerk:<subject>` mapping agree. Check for duplicate users or legacy summaries before relying on unique queries.
- [ ] Sign in as owner and second user; confirm private content cannot be read before an accepted grant, and deleted/ended rooms cannot issue new video tokens.
- [ ] Verify ordinary create/join/leave/message/invitation flows with the intended deployment.
- [ ] Set matching server-only summary secret, OpenAI key and explicit provider budget; use synthetic conversation content for the first paid call.
- [ ] Generate once, inspect factual accuracy, reload, and verify saved content matches the finished stream. Confirm retry limits and cancellation state.
- [ ] Verify microphone/camera permissions and actual LiveKit connectivity on two clients; do not claim automatic transcription.
- [ ] Verify a Resend email is accepted and received at the intended address and invitation use is restricted to that verified address.
- [ ] Define retention, erasure and participant consent before real customer data.
- [ ] Record deployment commit SHA, environment and screenshots/demo; only then feature as a working live demo.

## Rollback

Disable `ENABLE_AI_SUMMARIES` first. Do not erase tables or restore the previous unauthenticated routes as a shortcut. Retain compatible schema, fix forward or revert the narrow UI/provider change. Production migration and rollback require a separate environment-specific review.
