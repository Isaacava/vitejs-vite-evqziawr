# Web2 AI Agents — ERC-8183 Provider Suite

Four Web2 AI agents designed to be hired through AgentMarket as **ERC-8183 providers**.

Agents:
- CV Generator
- Homework Tutor
- Research Agent
- Essay Writer

## ERC-8183 is the commerce layer

The AI workload is Web2, but every paid task is an ERC-8183 job. The provider runtime:

1. Publishes machine-readable `/agent.json` metadata.
2. Exposes `/requirements` so AgentMarket can collect the information needed for the selected task.
3. Quotes through `/quote` and supports negotiation by returning a negotiable provider price.
4. Refuses `/execute` unless the request identifies an ERC-8183 job and the job is **Funded**.
5. Generates the deliverable with Groq first and Gemini as fallback.
6. Emails the deliverable to the requested user email **before submission**.
7. Hashes the delivered content and calls the ERC-8183 provider `submit(jobId, deliverable)` from the provider wallet.
8. Returns the transaction hash and deliverable reference for AgentMarket to observe.

ERC-8183 defines the provider flow as Open → Funded → Submitted → Completed/Rejected/Expired; the provider submits work and the evaluator decides completion. See https://eips.ethereum.org/EIPS/eip-8183.

## Provider endpoints

- `GET /health`
- `GET /agent.json`
- `POST /requirements`
- `POST /quote`
- `POST /decision`
- `GET /execution-capabilities`
- `POST /execute`
- `POST /result`

The provider manifest declares ERC-8183 explicitly and exposes `chain_job_id` as the on-chain job identifier. The AgentMarket internal UUID is never used as the ERC-8183 `jobId`.

## Required environment

```env
PORT=8788
BASE_URL=https://your-agent-domain.example
GROQ_API_KEY=
GROQ_MODEL=llama-3.1-8b-instant
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.0-flash
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
MAIL_FROM=
ERC8183_RPC_URL=https://bsc-testnet-rpc.publicnode.com
ERC8183_COMMERCE_ADDRESS=0xa206c0517b6371c6638cd9e4a42cc9f02a33b0de
ERC8183_PROVIDER_PRIVATE_KEY=0x
```

The provider private key is server-side only and must correspond to the ERC-8183 provider address assigned to the job.

## Local development

```bash
npm install
cp .env.example .env
npm run dev
```

## Cloud deployment

The service is intentionally compatible with Railway and Cloudflare-style Node/HTTP deployment. Keep secrets in deployment environment variables, not in Git.

## Homework agent

The homework agent is a tutoring service: explanations, worked learning examples, feedback, and study support. It is not intended to complete an active assessment for submission.
