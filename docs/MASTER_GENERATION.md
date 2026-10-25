# AI master generation — 2026-10-25

Scope: character description and art style → server-side OpenAI Images API → unapproved candidate → explicit adoption. The provider boundary is injectable for tests; current implementation uses OpenAI. API reference: https://developers.openai.com/api/reference/resources/images/methods/generate

Input used: 북미에서 게임 개발자로 일하다가 이번에 회사를 차리려는 30대 개발자.
Output contract: PNG portrait, 1024×1536 requested; browser decodes actual dimensions, maintains aspect ratio. Generation metadata includes model, prompt, request ID, duration, usage when supplied; cost is unknown and must be checked at provider. No fabricated price or face-consistency score.

Server key lives only in .env/environment. Static server exposes only index.html and API routes, not .env or repository files. Missing key is actionable 503. JSON body/description limits, same-origin browser requests, single-flight generation, bounded in-memory duplicate request cache. No automatic upstream retry; failed/timeout requests advise checking provider usage. In-memory deduplication is process-local, not durable billing protection. Local single-user tool, not public SaaS.

Results remain review_required until user adoption. Old master/expression snapshots are archived and existing scenes pin their old master version; new scenes use the new master. Local quota errors roll adoption and scene pins back. Candidate can be downloaded or discarded. Manual-upload legacy replacement behavior is unchanged. No normalization pipeline exists; generated source and rendered preview are the available evidence.

Validation:
- npm test: 7 tests passed: missing key, provider contract/duplicate request/key privacy, provider failure/no retry, terminal player, variable isolation, archived scene rendering, quota rollback.
- Actual Chrome: specified description submitted; missing API key message verified against real server.
- Actual character image generated separately with built-in image generation (2D visual novel, front-facing full-body developer, neutral background; original image retained).
- Isolated browser QA server injected that real PNG as the provider response (NOT a live OpenAI API generation). Loading/disabled button, candidate preview, manual adoption, decoded 1024×1536, and empty new expression set verified.
- Live paid Images API roundtrip remains unverified: no OPENAI_API_KEY in this environment. Mock server and key are outside repository and never part of production.

Run Node 22+, cp .env.example .env, set OPENAI_API_KEY locally, npm run dev. Model defaults to gpt-image-1.5 and is configurable. API organization access/credits are required. No API key was committed.
