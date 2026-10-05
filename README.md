# NexTalk

Real-time discussion rooms with an **optional, server-controlled AI summary workflow**. Built with Next.js, TypeScript, Convex, Clerk and LiveKit; the AI integration uses the Vercel AI SDK with OpenAI.

## What this implementation demonstrates

- Room creation and membership, live chat, invitations and LiveKit token issuance.
- Summaries of **stored chat messages and finalized captions**, streamed to the UI and saved only after a complete model response.
- Verified user and room-owner authorization, explicit consent, bounded input/output, transactional request quotas, cancellation and truthful save/error states.
- Server-side provider credentials; the browser cannot submit an arbitrary transcript or forge another user's identity.
- Backend, HTTP route and UI regression tests without paid API calls.

This is a portfolio application, **not a claim of production certification**. Automatic speech-to-text, RAG, autonomous agents and model training are not implemented. Existing recording controls represent application state; a verified audio recording/transcription pipeline is not part of this delivery. AI output can be inaccurate and needs human review.

## Architecture

```text
Clerk session -> Convex JWT -> verified user / room membership
                              |
Room owner + consent -> POST /api/summary
  -> Convex: authorize, reserve quota, collect bounded source
  -> OpenAI via AI SDK: stream without tools or automatic retries
  -> Convex: validate run and persist the actual completed output
  -> UI: saved receipt, then enable download
```

The recovery ports the useful AI intent from the historical `frontend` branch onto the newer `main` interface. It deliberately does not overwrite `main` with that divergent branch or restore its unsupported transcription endpoint.

## Local setup

Use **Node.js 24 LTS and npm**. The package manifest also permits Node 25/26; the repair was locally validated with Node 26.8.2. `package-lock.json` is the only supported dependency lockfile.

```sh
npm ci --ignore-scripts
cp .env.example .env.local
```

1. Create/select **development** Clerk and Convex projects. Fill the public identifiers and the Clerk server key locally.
2. Configure a Clerk JWT template named `convex`, with audience `convex`. Set `CLERK_JWT_ISSUER_DOMAIN` in the **Convex deployment environment** to the issuer of that same Clerk instance. Invitation acceptance additionally requires verified `email` and `email_verified` claims in that JWT; map them from Clerk account verification, never from editable user metadata. The verified subject maps to the existing `clerk:<subject>` user records.
3. Run `npx convex dev` against that development project to validate/deploy schema and functions and generate API types. Run `npm run dev` in a second terminal.
4. Configure LiveKit server URL/key/secret for video. Configure Resend with a verified `RESEND_FROM_EMAIL` and canonical `NEXT_PUBLIC_APP_URL` for invitations. Missing configuration fails closed; these are not required for unit tests.
5. To enable summaries, configure an OpenAI project key on the Next server and set a freshly generated `SUMMARY_SERVICE_SECRET` (at least 32 characters) on **both Next and Convex**. Then set `ENABLE_AI_SUMMARIES=true` on Next. Never prefix secrets with `NEXT_PUBLIC_`.

The existing OpenAI model default is `gpt-4o`; `OPENAI_SUMMARY_MODEL` selects a compatible OpenAI chat model. This is **not** a multi-provider switcher. Validate model availability and output behavior before changing it. No fallback provider is used.

## Cost and privacy boundaries

- At most **100 recent messages + 100 recent captions**, and **30,000 characters** of serialized source; incomplete captions and deleted messages are excluded. It is an excerpt, not necessarily the entire meeting.
- At most **2,000 generated tokens**, 12,000 output characters, and a 45-second generation timeout. No automatic provider retries.
- At most **10 attempts/user/24h**, **100 attempts/deployment/24h**, and one attempt per room per minute. Failed attempts count. These are request quotas, **not an exact dollar spending ceiling**; configure provider-side budget alerts/limits too.
- The owner must consent before the server sends conversation text to OpenAI. Names/emails are not added as metadata, but users may put personal information inside message text. Obtain participant consent and avoid confidential data.
- Source text is treated as untrusted data; no tools are exposed to the model. Prompt instructions reduce risk but are not a proof against hallucination or prompt injection.
- Summaries remain in Convex; usage rows contain metadata, not prompts. No automatic retention/erasure policy is implemented. Define one before using real customer data.
- Participants with room-history access can read a saved summary; only its owner can generate it. Cancellation can race with a completed save: reopen the summary to verify state before retrying.

## Validation

### Short demo path

Use only a matched **development** Clerk/Convex setup and disposable test accounts/rooms. Start with `npm run dev` after the local setup above; do not point a demo at production data.

1. Home → **Explore rooms**: explain live versus scheduled rooms and the empty state.
2. Sign in → **New Video Room**: create a room with a readable title. Private rooms display a case-sensitive access code; copy it exactly.
3. **Join Private Room** → paste the code → video pre-join screen. A working call additionally requires configured LiveKit; seeing the lobby is not connection proof.
4. For an existing authorized chat room, open it from **Live rooms**. This route currently demonstrates text chat, not an active audio call.

Do not demo paid AI generation, audio recording/replay or automatic captions as working features. Local unit tests and isolated UI fixtures do not verify external authentication, video or email delivery.

### Checks

```sh
npm run typecheck
npm run lint
npm test
npm audit --omit=dev --audit-level=high
npm run build
```

Build requires public Convex/Clerk identifiers. Synthetic identifiers can validate compilation but do not prove authentication or external integrations work. Tests use `convex-test`, mocked providers and browser component tests; see [validation and release checklist](docs/ai-summary-readiness.md) for exact limitations.

## Safe rollout

Keep AI disabled, back up existing data and inspect the target environment first. Deploy compatible Convex schema/functions **before** the Next application, configure matched development credentials, and complete the real-service checklist before promoting a demo. Do not enable public demo traffic or production migrations merely because tests pass.

`NEXTALK_ADMIN_USER_IDS` is an optional Convex-only allowlist of verified Clerk subjects. Destructive maintenance also requires `ALLOW_DESTRUCTIVE_OPERATIONS=true`; leave it unset in normal environments.
