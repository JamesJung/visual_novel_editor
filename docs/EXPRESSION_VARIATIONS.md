# Master-referenced expression variations — 2026-10-25

## Scope / workflow
Character Studio → confirmed master → select neutral/smile/frown/angry/crying/surprised → generate → compare master/candidate → manually approve or discard/download.
One expression per explicit click; no automatic six-image billing batch. Every request sends the original master PNG bytes to OpenAI Images Edits, never the last expression. Default gpt-image-1.5 uses high input fidelity. Other models omit that parameter unless mini (low). Provider key stays server-side.

POST /api/generate-variation accepts requestId, masterSrc (PNG data URL), masterVersion, expression. Supported original canvases: 1024×1536, 1536×1024, 1024×1024. Other dimensions/MIME are rejected rather than implicitly resized. Output metadata retains master hash/version, expression, view/outfit, prompt, model, usage, duration and unknown cost. Same-origin, size limits, single-flight and process-local request deduplication are shared with master generation. No automatic retry on failure.

Generated candidates are separate from active expressions. Approval requires current master version and identical decoded pixel dimensions; it does not claim facial identity or anchor equivalence. Old expression assets are archived when replaced, and existing scenes pin their prior expression asset. New scenes use the latest approved expression. Explicit character/expression edits release the relevant old pins. Local save failure rolls approval and scene references back. A master/project changed during generation causes the returned candidate to be discarded, not attached to the replacement master. AI generation is not normalization; source and renderer are available, no normalized intermediate exists.

## Validation
- npm test: 14 tests passed.
- All six expressions tested against a mocked upstream: multipart original master byte equality, image edits endpoint, input fidelity, unchanged size, review-required state, hash/version trace and duplicate ID rejection.
- Invalid MIME/reference/expression/canvas rejected before provider invocation.
- Candidate approval rejects mismatched dimensions and stale master version.
- Approved replacement preserves previous scene rendering; unapproved candidate never renders in player.
- Quota errors roll approval back. Explicit scene edits release stale references.
- Actual Chrome with isolated mocked provider response: smile candidate preview alongside original, manual approval, approved state and 1024×1536 persisted after reload.
- Browser fixture is geometric, deliberately not evidence of expression quality. No live paid API call was made: this environment has no full API key. Face identity, pixel alignment, other viewport/DPR combinations, real image-edit quality/cost and provider-specific access remain unverified.

## Remaining scope
Expression variation only. Outfit/pose generation, facial landmark validation, normalization and bulk generation are not included. Browser localStorage remains capacity-limited; download candidates/back up JSON when needed. Legacy manual upload replacement behavior remains distinct from AI candidate approval.

API reference: https://developers.openai.com/api/reference/resources/images/methods/edit
