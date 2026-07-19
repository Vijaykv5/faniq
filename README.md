# FANIQ

FANIQ is a World Cup fan passport app built with Next.js, Solana, Anchor, TxLINE data, and Metaplex Core NFTs. Fans choose one supporter country, mint an on-chain passport, create celebration memories as NFTs, and explore country/match stories through an interactive globe.

## Tech Stack

- **Frontend:** Next.js App Router, React, TypeScript, Tailwind CSS
- **3D Globe:** `react-globe.gl`, Three.js
- **Wallets:** Solana Wallet Adapter
- **NFTs:** Metaplex Core on Solana devnet
- **Program:** Anchor program in `contract/`
- **Sports Data:** TxLINE fixtures, score snapshots, and historical score feeds
- **Database:** Neon Postgres via `@neondatabase/serverless`
- **Storage:** Server-side Irys upload for memory images and metadata
- **AI Summaries:** OpenRouter for match interval summaries when usable event data exists

## Main App Routes

- `/` - landing/home experience
- `/atlas` - interactive globe with country match context and fan memories
- `/create/memory` - upload and mint a fan memory NFT
- `/profile` - digital fan passport and wallet-wide minted memories
- `/story/match/[fixtureId]` - match recap chapters from TxLINE data

## API Routes

- `GET /api/atlas/country` - country fixture, previous match, and fan memory data
- `GET /api/atlas/match-story` - fixture score data and match chapter summaries
- `POST /api/memory/upload` - server-side Irys upload for image and NFT metadata
- `GET/POST /api/profile/passport` - fan passport profile persistence
- `GET/POST /api/profile/memories` - minted memory persistence and wallet NFT lookup
- `/api/txline/*` - TxLINE guest/session and proxy helpers

## Solana Program

The Anchor program lives in:

```bash
contract/programs/faniq_passport
```

Deployed devnet program:

```text
FANXexs6P2Fst4NiiCdH9jx39sxPCGRRVpC2nevL5C6U
```

[View on Solana Explorer](https://explorer.solana.com/address/FANXexs6P2Fst4NiiCdH9jx39sxPCGRRVpC2nevL5C6U?cluster=devnet)

It enforces the core identity rules:

- one wallet can create one fan passport
- the supporter country is locked after passport creation
- memories can be registered against a passport

Program accounts:

- **FanPassport PDA:** `["passport", owner]`
- **MemoryRecord PDA:** `["memory", owner, nft_mint]`

Main instructions:

- `create_passport(country)` - creates the locked fan passport
- `register_memory(memory_country, nft_mint, metadata_uri)` - links a memory NFT to the passport

Useful commands:

```bash
bun run anchor:check
bun run anchor:build
```

## Environment Variables

Create `.env` or configure these in your deploy environment:

```env
DB=
TXLINE_API_TOKEN=
TXLINE_GUEST_JWT=
OPENROUTER_KEY=
IRYS_SERVER_SOLANA_SECRET_KEY=
NEXT_PUBLIC_SOLANA_DEVNET_RPC_URL=
NEXT_PUBLIC_FANIQ_PASSPORT_PROGRAM_ID=
```

`IRYS_SERVER_SOLANA_SECRET_KEY` should be a funded devnet Solana secret-key array used only by the server to pay Irys upload costs. Do not use a main wallet for production.

## Local Development

Install dependencies:

```bash
bun install
```

Run the dev server:

```bash
bun run dev
```

Open:

```bash
http://localhost:3000
```

## Verification

Before shipping changes:

```bash
bunx tsc --noEmit
bun run lint
bun run build
```

The production build may print a `bigint` native binding warning. The app still builds successfully.
