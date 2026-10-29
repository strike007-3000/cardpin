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

The only network request the app makes at runtime is a read-only fetch of public exchange rates (jsDelivr CDN), and only when you choose a spend currency different from the country's base currency. No wallet, spend or merchant data is ever sent.

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
| `apps/web/` | Next.js frontend configured for static export (also holds the PWA `manifest.json` and `sw.js`, and the local dev-tools server `dev.ts`) |
| `packages/engine/` | Pure TypeScript recommendation engine |
| `packages/schemas/` | Zod schemas for datasets |
| `data/be/` | Belgium dataset |
| `data/de/` | Germany dataset |
| `data/nl/` | Netherlands dataset |
| `data/us/` | United States dataset |
| `scripts/compile-datasets.ts` | Dataset validation and static bundle generation |
| `scripts/format-datasets.ts` | Sorts and formats dataset JSON |
| `scripts/check-stale.ts` | Lists reward rules not re-verified in 180 days |
| `scripts/check-links.ts` | Checks every source URL in every dataset |
| `scripts/import-us-csv.ts` | Bulk CSV importer used for the US dataset |
| `design/` | Journey design canvas (see `design/README.md`) |
| `.github/` | CI workflow, issue templates, PR template, CODEOWNERS |

## Local Setup

### Prerequisites

- **Node.js**: Version `24` (the version CI runs; a `.nvmrc` is provided).
- **Corepack**: Required to manage the package manager version automatically.

### Installation & Development

This project uses the package manager declared in `package.json`:

```json
"packageManager": "pnpm@10.34.4"
```

To set up the project locally:

1. Ensure you are using Node.js 24 (e.g. run `nvm use` if using NVM).
2. Enable Corepack and activate the configured `pnpm` version:
   ```bash
   corepack enable
   corepack prepare pnpm@10.34.4 --activate
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
- **List Stale Rules**: `pnpm check:stale [days]` (reward rules not re-verified in 180 days by default)
- **Check Source Links**: `npx tsx scripts/check-links.ts` (requests every source URL; slow on the US dataset)
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

CardPin currently has datasets for Belgium (`data/be/`, 31 cards), Germany (`data/de/`, 31), Netherlands (`data/nl/`, 18), and United States (`data/us/`, 166). The US dataset has no merchants yet, so US recommendations work by category. Each dataset contains:

- `issuers.json`
- `cards.json`
- `merchants.json`
- `reward_rules.json`

To add an issuer, edit the relevant `issuers.json` file and use a stable lowercase kebab-case `id`.

To add a card, edit the relevant `cards.json` file, reference an existing `issuerId`, use the correct uppercase country code, and include source proof for card terms where the schema requires it. Cards default to `currency: "EUR"`; set `currency` (3-letter uppercase code, e.g. `USD`) for any other currency, since fees and rewards are shown in the card's own currency.

To add a merchant, edit the relevant `merchants.json` file and use categories from the registry in `packages/schemas/src/index.ts` (`groceries`, `travel`, `dining`, `fuel`, `utilities`, `online-shopping`, `transport`, `entertainment`, `fallback`) so reward rules continue to match predictably.

To add a reward rule, edit the relevant `reward_rules.json` file and reference an existing `cardId`. Reward types are `cashback_percentage`, `fixed_cashback`, `points` and `miles`; caps and minimum spend go in `cap` / `conditions`. Do not guess reward rates. Every reward rule must be backed by an official public source.

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

## Production Features (v1.2.18)

Version history below is documented per release; the latest release is first.

### Points & Miles Valuation
Points and miles are converted to currency before cards are compared, so a `1x points` card no longer outranks a `5%` cashback card just because the raw number is bigger. The wallet panel has a **1 point / mile ≈** selector (0.5¢, 1¢, 1.5¢, 2¢; default 1¢) that is saved in `localStorage` (`cardpin:point_value`) and passed to `recommendBestCard({ valuations })`. The result still displays raw points or miles; only ranking and "Next Card to Unlock" use the converted value.

### Per-Country Base Currency
Rewards are calculated in the country's own currency: **USD for the United States, EUR for Belgium, Germany and the Netherlands** (`baseCurrencyFor()` in `apps/web/src/lib/utils.ts`). Spend entered in any other currency is converted to the base currency, and a card is treated as foreign spend only when the spend currency differs from the base. Reward amounts, FX fees, annual fees and the catalog all show the card's own `currency` instead of a fixed "EUR". `getFxRate(rates, currency, base)` returns units of `currency` per 1 unit of `base`; the rates API is still quoted per EUR.

### Monthly Caps Reset Automatically
"Spent this month" is stored per calendar month under `cardpin:monthly_spend:<YYYY-MM>:<cardId>` (local time), so caps and the `⚠️ CAP REACHED` flag reset on the 1st. Values saved under the old unscoped key are ignored.

### Annual Fee on "Next Card to Unlock"
The unlock banner shows the card's annual fee (or "No annual fee") and, when the card beats your current best on this purchase, roughly how many purchases like it are needed to cover the fee (`breakEvenPurchases()`).

### "Amex Not Accepted?" Fallback
When the best card is on the `amex` network, the result shows the best alternative on another network and its value, since Amex is often refused at European terminals.

### Dark Mode & Offline Shell
A floating toggle switches between light and dark themes (saved in `localStorage`). The service worker precaches the app shell and the `be`, `de`, `nl` and `us` datasets; its cache name tracks the app version so releases refresh cached data.

### Mobile Merchant Suggestions
The merchant field uses a custom suggestion list (up to 8 matches, 44px tap targets) instead of the native `<datalist>`, whose popup could not be styled or positioned on phones. It is a `combobox`/`listbox`; arrow-key navigation is not implemented yet.

## Production Features (v1.2.16)

### United States Dataset Ingestion (`data/us/`)
Expanded CardPin dataset coverage to include **166 US credit cards**, **16 major issuers** (Chase, American Express, Citi, Capital One, Bank of America, U.S. Bank, Discover, Wells Fargo, etc.), and **345 welcome bonus & reward rules**.

### Automated CSV Data Import Pipeline
Introduced a node-based CSV import runner (`scripts/import-us-csv.ts`) to ingest bulk credit card data dumps, map raw card attributes to Zod schemas with unique kebab-case IDs (`${issuerId}-${rawName}-${rawCardId}`), and validate generated JSON entities against `CountryCardsJsonSchema`, `CountryIssuersJsonSchema`, and `CountryRewardRulesJsonSchema` prior to writing to disk. Run `pnpm compile:data` as a follow-up step to bundle the dataset for the frontend app.

### Uncategorized Base Earning Fallbacks
Universal base reward rules are kept uncategorized (`!r.category`) so that the recommendation engine (`recommendBestCard()`) matches them as general fallback rules for all transaction categories when no category-specific bonus rules apply.

### Loyalty Program & Non-Cash Base Units (`points` and `miles`)
Base reward rates accurately distinguish cash earnings (`cashback_percentage`) from loyalty points (`points`) and airline miles (`miles`) for rewards programs (Delta SkyMiles, Chase Ultimate Rewards, Amex Membership Rewards, Hilton Honors, Marriott Bonvoy, etc.).

## Production Features (v1.2.15)

### Modular Custom-Hook Architecture
Refactored `CardPinCalculator` into specialized, typed custom React hooks (`useWalletDataset` and `useDevTools`). Separated dataset loading, wallet synchronization, catalog search, monthly spend calculations, and dev tools panel management from presentation components, ensuring high maintainability, strict type safety, and zero lint warnings.

### Always-Available Recommendation Engine & Fallback Cards
Eliminated blank and generic "No recommendation" error states during search. When a search query produces no matching bonus rules for the user's owned cards, CardPin dynamically falls back to recommending the best base card (e.g. lowest FX fee card for foreign transactions or standard base reward card) and displays clear fallback rationale.

### Transparent Rule Disqualification Tags
Alternative cards in the comparison list now display explicit disqualification tags when applicable:
- ⚠️ **Cap Reached**: Indicates a card's monthly reward cap has been exhausted.
- ⚠️ **Min Spend €X Not Met**: Highlights when a purchase amount falls below a rule's minimum threshold.
- ℹ️ **No Bonus Rule**: Indicates standard base reward terms apply.

### Explicit Foreign Transaction Controls & Expanded Multi-Currency Support
Added an explicit **"✈️ Spending abroad / Foreign transaction"** toggle to the input strip so users can signal foreign spend regardless of currency. Expanded currency selection support to include **EUR, USD, GBP, CHF, JPY, CAD, AUD, SEK, NOK, DKK, PLN, CZK**.

### Wallet Reward Cap Exhaustion Warnings
Wallet cards in the wallet manager feature real-time cap exhaustion alerts (`⚠️ CAP REACHED` / `⚠️ CAP`) whenever a user's configured monthly spend reaches the card's reward cap limits.

### Human-Readable Source Verification Timestamps
Verification dates for card terms and reward rules are formatted into human-readable relative time (e.g., *"Verified 2 months ago"* or *"Verified this month"*) for clearer data freshness context.

### Minimum Spend Threshold Evaluation
To prevent recommending rules on transactions that do not qualify for reward tiers, the recommendation engine dynamically validates purchase amounts against `conditions.minSpend` defined in dataset rules. If a purchase falls below a rule's minimum threshold, rewards are zeroed out for that rule.

### Card Portfolio Optimization & "Next Card to Unlock" Recommendations
CardPin evaluates un-owned cards matching the user's active country dataset alongside their wallet. When an un-owned card yields higher net rewards than the user's current wallet (or when no cards are selected), CardPin displays a **Next Card to Unlock** banner in the dashboard showing the calculated extra reward benefit.

### Redesigned Single-Screen Dashboard Layout
Reorganized the primary calculator interface into a single-screen responsive utility. On desktop, the result hero card is positioned at the top-left, transaction parameters entry input strip at the bottom-left, and the wallet manager resides in a sidecar column on the right. On mobile, the vertical flow prioritizes calculation results at the top, followed by transaction inputs, with wallet management stacked cleanly at the bottom.

### Decomposed Component Architecture
Refactored the `CardPinCalculator` page into modular, typed components:
- `CountryAudienceSelector` (compact top bar controls)
- `InputStrip` (integrated purchase parameters row with foreign spend toggle)
- `ResultHero` (high-density recommendation display with fallback support)
- `WalletManager` (sidecar wallet setups with cap alerts and imports/exports)
- `StatusBanner` (unified state handlers for empty/pre-search states)

### Data-Anchored Storytelling User Journey
CardPin features a 3-stage progression that balances instant in-store decision-making with narrative transparency:
- **Stage 1: Context Setting (`InputStrip`)**: Purchase parameters with quick spend presets (10, 50, 100, 500 in the selected currency), currency selection, and foreign transaction toggle.
- **Stage 2: Recommendation Rationale (`ResultHero`)**: Instant recommendation display alongside plain-English story rationale explaining reward multipliers, FX fee offsets, or base card fallbacks.
- **Stage 3: Portfolio Opportunity Story (`WalletManager`)**: Unowned catalog card recommendations highlighted with exact comparative return deltas.

### Apple Wallet-Inspired Card Stack
Owned cards use a stable vertical stack with a consistent visible header for every collapsed card and one fully expanded selected card. Selecting a collapsed card moves it to the front cleanly. Selected-card settings (monthly spend input and removal) are integrated directly inside the active card shell, while import, export, and clear actions live in a compact wallet-options menu.

### Accessible, Responsive Workflow
CardPin uses keyboard-visible focus states, semantic selectable cards with proper `role="button"` accessibility, an accessible native card-catalog dialog, and touch-friendly actions. On small screens, wallet spacing is compressed so the purchase search remains close to the selected cards. Search controls stay disabled until a card is selected and provide a direct route to the catalog.

The interface uses the operating system font stack to avoid a render-blocking third-party font request. Live exchange rates are fetched only after a currency other than the country's base currency is selected. Recommendations wait for a valid selected-currency rate, preventing missing or malformed rates from silently treating foreign spend as base-currency spend.

### Offline-First PWA (Progressive Web App)
CardPin is configured as a fully installable PWA. A Service Worker (`sw.js`) caches the application shell and country datasets (`/data/*.json`) locally. Base-currency recommendations work offline; foreign-currency recommendations also work when a valid rate is available in the session cache.

### Earning Caps & Monthly Budget Tracking
To prevent recommending cards that have reached their monthly reward limits, users can input their *Spent this month* value (reset automatically each calendar month) inside each card mockup. The recommendation engine dynamically tracks this against the card rule's `cap` (or `conditions.cap`) and applies fallback rates or zero points/miles on the portion of the purchase exceeding the limit.

### Automated Link Scanner
To verify that database reference URLs remain active, run the link scanner utility:
```bash
npx tsx scripts/check-links.ts
```
This utility parallel-scans all reference URLs inside the datasets to identify broken (e.g. 404, 403, or failed) bank terms pages.

### Local Developer Data Manager
To easily merge or update data without manual text editing:
1. Run the local dev server: `pnpm dev`
2. Open `http://localhost:3000/?dev=true` (`pnpm dev` also starts a local-only helper server on port 3001 that writes to `data/`)
3. Click **🔧 Dev Tools** at the bottom-right corner to open the bulk importer modal. You can paste raw JSON arrays or objects and click **Merge & Recompile Datasets** to write, format, validate, and compile changes to disk automatically.

## Disclaimer

CardPin is not financial advice. Data is community-sourced and may be inaccurate or outdated. Always verify terms with official issuer sources before making decisions.

See [DISCLAIMER.md](DISCLAIMER.md) for the full disclaimer.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for data standards, workflow, and PR expectations.

## License

CardPin is released under the MIT License. See [LICENSE](LICENSE).
