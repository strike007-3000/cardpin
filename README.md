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
| `data/de/` | Germany dataset |
| `data/nl/` | Netherlands dataset |
| `scripts/compile-datasets.ts` | Dataset validation and static bundle generation |

## Local Setup

### Prerequisites

- **Node.js**: Version `20` (LTS is recommended. A `.nvmrc` is provided).
- **Corepack**: Required to manage the package manager version automatically.

### Installation & Development

This project uses the package manager declared in `package.json`:

```json
"packageManager": "pnpm@9.0.0"
```

To set up the project locally:

1. Ensure you are using Node.js 20 (e.g. run `nvm use` if using NVM).
2. Enable Corepack and activate the configured `pnpm` version:
   ```bash
   corepack enable
   corepack prepare pnpm@9.0.0 --activate
   ```
3. Install dependencies:
   ```bash
   pnpm install
   ```
4. Compile the datasets into static frontend JSON bundles:
   ```bash
   pnpm compile:data
   ```
5. Run the development server:
   ```bash
   pnpm dev
   ```

If your environment or shell does not expose `pnpm` globally, use the Corepack fallback prefix:

```bash
corepack pnpm install
corepack pnpm compile:data
corepack pnpm dev
```

### Validation & Build

Run the following commands to validate the data and build the application:

- **Format Datasets**: `pnpm format:data` (alphabetizes data collections and applies standard spacing)
- **Validate Datasets**: `pnpm validate:data` (checks schema rules, duplicates, relational integrity, and formatting)
- **TypeScript Typecheck**: `pnpm typecheck`
- **Lint Codebase**: `pnpm lint`
- **Run Unit Tests**: `pnpm test`
- **Build Production App**: `pnpm build` (this compiles the datasets and builds the static Next.js export in `apps/web/out`)

Fallback forms:

```bash
corepack pnpm format:data
corepack pnpm validate:data
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build
```

## Data Validation

Use these commands when editing datasets:

```bash
pnpm validate:data
pnpm compile:data
```

`pnpm validate:data` checks schemas and relationships without writing compiled bundles. `pnpm compile:data` performs the same validation and updates the static JSON bundles consumed by the web app.

## Adding Data

CardPin currently has datasets for Belgium (`data/be/`), Germany (`data/de/`), and the Netherlands (`data/nl/`). Each dataset contains:

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

## Production Features (v1.2)

### Apple Wallet-Inspired Card Stack
Owned cards use a stable vertical stack with a consistent visible header for every collapsed card and one fully expanded selected card. Selecting a collapsed card moves it to the front without rotation, absolute positioning, manual height calculations, or scattered z-index rules. Selected-card settings stay attached to the stack, while import, export, and clear actions live in a compact wallet-options menu.

### Accessible, Responsive Workflow
CardPin uses keyboard-visible focus states, semantic selectable cards, an accessible native card-catalog dialog, and touch-friendly actions. On small screens, wallet spacing is compressed so the purchase search remains close to the selected cards. Search controls stay disabled until a card is selected and provide a direct route to the catalog.

The interface uses the operating system font stack to avoid a render-blocking third-party font request. Live exchange rates are fetched only after a non-EUR currency is selected; the existing session cache and offline fallback still apply.

### Offline-First PWA (Progressive Web App)
CardPin is configured as a fully installable PWA. A Service Worker (`sw.js`) caches the application shell and country datasets (`/data/*.json`) locally. The application can open and calculate card reward recommendations **100% offline** (e.g., when you have poor network coverage at a checkout counter).

### Multi-Currency FX Conversions
Users can select transaction currencies (EUR, USD, GBP, CHF, JPY) in Step 3. When a non-EUR currency is selected, CardPin fetches live rates from the Fawaz Ahmed Exchange Rates API, converts the transaction value into the card's native currency, calculates the reward value, deducts the card's specific foreign transaction fee, and shows the net outcome. Fetch requests are cached in `sessionStorage` to prevent redundant network calls.

### Earning Caps & Monthly Budget Tracking
To prevent recommending cards that have reached their monthly reward limits, users can input their *Spent this month* value inside each card mockup. The recommendation engine dynamically tracks this against the card rule's `cap` (or `conditions.cap`) and applies fallback rates or zero points/miles on the portion of the purchase exceeding the limit.

### Automated Link Scanner
To verify that database reference URLs remain active, run the link scanner utility:
```bash
npx tsx scripts/check-links.ts
```
This utility parallel-scans all reference URLs inside the datasets to identify broken (e.g. 404, 403, or failed) bank terms pages.

### Local Developer Data Manager
To easily merge or update data without manual text editing:
1. Run the local dev server: `pnpm dev`
2. Open `http://localhost:3000/?dev=true`
3. Click **🔧 Dev Tools** at the bottom-right corner to open the bulk importer modal. You can paste raw JSON arrays or objects and click **Merge & Recompile Datasets** to write, format, validate, and compile changes to disk automatically.

## Disclaimer

CardPin is not financial advice. Data is community-sourced and may be inaccurate or outdated. Always verify terms with official issuer sources before making decisions.

See [DISCLAIMER.md](DISCLAIMER.md) for the full disclaimer.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for data standards, workflow, and PR expectations.

## License

CardPin is released under the MIT License. See [LICENSE](LICENSE).
