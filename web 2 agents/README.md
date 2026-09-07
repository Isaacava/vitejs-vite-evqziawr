# Web2 AI Agents — ERC-8183 + ERC-8004 Provider Suite

Four Web2 AI agents designed to be hired through AgentMarket as **ERC-8183 providers** and automatically registered with **ERC-8004** on **BSC Testnet (chain ID 97)**.

Agents:
- CV Generator
- Homework Tutor
- Research Agent
- Essay Writer

## ERC-8183 commerce layer

The AI workload is Web2, but every paid task is an ERC-8183 job. The provider runtime:

1. Publishes machine-readable `/agent.json` metadata.
2. Exposes `/requirements` so AgentMarket can collect the information needed for the selected task.
3. Quotes through `/quote` and supports negotiation by returning a negotiable provider price.
4. Refuses `/execute` unless the request identifies an ERC-8183 job and the job is **Funded**.
5. Generates the deliverable with Groq first and Gemini as fallback.
6. Emails the deliverable to the requested user email **before submission**.
7. Hashes the delivered content and calls the ERC-8183 provider `submit(jobId, deliverable)` from the provider wallet.
8. Returns the transaction hash and deliverable reference for AgentMarket to observe.

## ERC-8004 identity layer

At startup, each of the four agents is automatically registered in the ERC-8004 Identity Registry on BSC Testnet when a public `BASE_URL` and the provider wallet key are configured. The runtime first searches the registry's `Registered` events for an existing matching agent URI, so a restart does not intentionally mint another identity for the same agent URI.

The BSC Testnet ERC-8004 Identity Registry is `0x8004A818BFB912233c491871b3d84c89A494BD9e`, and the registration file follows the ERC-8004 registration-v1 schema. Each agent publishes its own registration document under `/erc8004/<agent-id>.json`, and the document links back to the BSC Testnet registry and assigned `agentId`.

The runtime exposes ERC-8004 metadata in `/health` and `/agent.json`, including the CAIP-10 registry identifier `eip155:97:0x8004A818BFB912233c491871b3d84c89A494BD9e`.

## Provider endpoints

- `GET /health`
- `GET /agent.json`
- `GET /erc8004/<agent-id>.json`
- `POST /requirements`
- `POST /quote`
- `POST /decision`
- `GET /execution-capabilities`
- `POST /execute`
- `POST /result`

The provider manifest declares both ERC-8183 and ERC-8004. `chain_job_id` is the on-chain ERC-8183 job identifier; an AgentMarket internal UUID is never used as the ERC-8183 `jobId`.

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
BSC_TESTNET_RPC_URL=https://bsc-testnet-rpc.publicnode.com
ERC8183_RPC_URL=https://bsc-testnet-rpc.publicnode.com
ERC8183_CHAIN_ID=97
ERC8183_COMMERCE_ADDRESS=0xa206c0517b6371c6638cd9e4a42cc9f02a33b0de
ERC8183_PROVIDER_PRIVATE_KEY=0x
ERC8004_IDENTITY_REGISTRY=0x8004A818BFB912233c491871b3d84c89A494BD9e
AUTO_REGISTER_ERC8004=true
```

The provider private key is server-side only. It must be the ERC-8183 provider wallet used for the jobs and has to hold enough BSC Testnet gas to perform the ERC-8183 submissions and ERC-8004 identity registrations.

## Local development

```bash
npm install
cp .env.example .env
npm run dev
```

## Cloud deployment

The service is compatible with Railway and Cloudflare-style Node/HTTP deployment. Keep secrets in deployment environment variables, not in Git. Set `BASE_URL` to the public HTTPS origin before enabling automatic ERC-8004 registration so the on-chain agent URI resolves to the live registration document.

## Homework agent

The homework agent is a tutoring service: explanations, worked learning examples, feedback, and study support. It is not intended to complete an active assessment for submission.
