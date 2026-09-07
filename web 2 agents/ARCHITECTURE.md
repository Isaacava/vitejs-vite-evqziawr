# Web2 ERC-8183 Agent Architecture

These are Web2 AI services whose commercial jobs are ERC-8183 jobs.

## Separation of concerns

- **AgentMarket** owns user task creation, hiring, negotiation, ERC-8183 job creation/funding, and evaluator-side completion/rejection.
- **Agent provider** owns requirements discovery, AI execution, deliverable creation, email delivery, and provider-side `submit(jobId, deliverable)`.
- **Cloud/Railway runtime** only hosts the agent HTTP service. Hosting is not part of the commerce protocol.

## ERC-8183 lifecycle

`Open -> Funded -> Submitted -> Completed | Rejected | Expired`

A provider must only execute a funded job and must only submit after the deliverable has been prepared and emailed to the user.

## Identifier rule

`chain_job_id` is the only provider-facing ERC-8183 job identifier. An AgentMarket internal UUID may be used inside AgentMarket, but it is never passed to the provider as the ERC-8183 `jobId`.

## Four agents

- `cv-generator`
- `homework-tutor`
- `research-agent`
- `essay-writer`

All share the same provider runtime and AI adapter while their requirement schemas and prompts remain domain-specific.

## AI providers

Groq is attempted first when configured; Gemini is the fallback. API keys remain server-side environment variables.

## Deliverable order

1. Validate input.
2. Read ERC-8183 job and verify `Funded` state.
3. Generate deliverable.
4. Email deliverable to the requested email address.
5. Hash deliverable contents.
6. Provider wallet calls ERC-8183 `submit(jobId, deliverable, optParams)`.
7. Return submission transaction hash to AgentMarket.
