# CardPin

[![CI](https://github.com/strike007-3000/Cardpin/actions/workflows/ci.yml/badge.svg)](https://github.com/strike007-3000/Cardpin/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

CardPin is a free, open-source payment card reward helper. The vision is simple: when you are about to pay, CardPin should make it easy to choose the card that appears to earn the best reward for that merchant, category, and spend amount.

CardPin is built for transparency and privacy. Reward data lives in this repository, recommendations are calculated in the browser, and users do not need to create an account or send their wallet choices to a server.

## Architecture

CardPin is static-first:

- No backend
- No authentication
- No database
- No server-side recommendation API
- No telemetry or analytics
- Browser-only preferences via `localStorage`

Data starts as country-scoped JSON files under `data/`. The compile script validates schemas and relationships, then writes static bundles to `apps/web/public/data/`. The Next.js app fetches those JSON bundles and runs the TypeScript recommendation engine locally in the browser.

```text
data/<country>/*.json
  -> pnpm compile:data
  -> apps/web/public/data/<country>.json
  -> static web app
  -> local browser recommendation
```

## Repository Layout

| Path | Purpose |
| --- | --- |
| `apps/web/` | Next.js frontend configured for static export |
| `packages/engine/` | Pure TypeScript recommendation engine |
| `packages/schemas/` | Zod schemas for datasets |
| `data/be/` | Belgium dataset |
| `data/nl/` | Netherlands dataset |
| `scripts/compile-datasets.ts` | Dataset validation and static bundle generation |

## Local Setup

```bash
pnpm install
pnpm compile:data
pnpm dev
```

Useful checks:

```bash
pnpm validate:data
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Data Validation

Use these commands when editing datasets:

```bash
pnpm validate:data
pnpm compile:data
```

`pnpm validate:data` checks schemas and relationships without writing compiled bundles. `pnpm compile:data` performs the same validation and updates the static JSON bundles consumed by the web app.

## Adding Data

CardPin currently has datasets for Belgium (`data/be/`) and the Netherlands (`data/nl/`). Each dataset contains:

- `issuers.json`
- `cards.json`
- `merchants.json`
- `reward_rules.json`

To add an issuer, edit the relevant `issuers.json` file and use a stable lowercase kebab-case `id`.

To add a card, edit the relevant `cards.json` file, reference an existing `issuerId`, use the correct uppercase country code, and include source proof for card terms where the schema requires it.

To add a merchant, edit the relevant `merchants.json` file and use existing category names where possible so reward rules continue to match predictably.

To add a reward rule, edit the relevant `reward_rules.json` file and reference an existing `cardId`. Do not guess reward rates. Every reward rule must be backed by an official public source.

## Source Attribution

Reward rules must include source attribution:

```json
{
  "source": {
    "sourceUrl": "https://www.example-bank.com/card-terms",
    "verifiedAt": "2026-06-14",
    "verifiedBy": "your-github-handle"
  }
}
```

Requirements:

- `sourceUrl` must point to an official issuer, card product, or terms page.
- `verifiedAt` must be the date you checked the source.
- `verifiedBy` must identify the contributor who verified the source.
- Reward rates, fees, exclusions, caps, and eligibility rules must be copied from official sources, not inferred from marketing summaries.

## Disclaimer

CardPin is not financial advice. Data is community-sourced and may be inaccurate or outdated. Always verify terms with official issuer sources before making decisions.

See [DISCLAIMER.md](DISCLAIMER.md) for the full disclaimer.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for data standards, workflow, and PR expectations.

## License

CardPin is released under the MIT License. See [LICENSE](LICENSE).
