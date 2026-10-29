# Contributing to CardPin

Thank you for helping improve CardPin. This project is a static-first, privacy-focused payment card reward helper, so contributions should preserve the current architecture: no backend, no authentication, no database, and no server-side recommendation service.

## Development Workflow

### Prerequisites

- **Node.js**: Version `24` (the version CI runs; a `.nvmrc` is provided).
- **Corepack**: Required to manage the package manager version automatically.

### Installation & Development

This project uses the package manager declared in `package.json`:

```json
"packageManager": "pnpm@10.34.4"
```

To set up the project locally:

1. Ensure you are using Node.js 24.
2. Enable Corepack and activate the configured `pnpm` version:
   ```bash
   corepack enable
   corepack prepare pnpm@10.34.4 --activate
   ```
3. Install dependencies:
   ```bash
   pnpm install
   ```

If your environment or shell does not expose `pnpm` globally, use the Corepack fallback prefix:

```bash
corepack pnpm install
```

### Validation & Build

Run the following commands to validate the data and build the application:

- **Format Datasets**: `pnpm format:data` (automatically alphabetizes dataset files by ID and standardizes spacing)
- **Validate Datasets**: `pnpm validate:data` (checks schemas, relational integrity, formatting, and duplicate IDs)
- **List Stale Rules**: `pnpm check:stale [days]` (rules not re-verified in 180 days by default)
- **Check Source Links**: `npx tsx scripts/check-links.ts` (requests every source URL in every dataset)
- **Compile Datasets**: `pnpm compile:data` (performs validation and compiles to static JSON bundles)
- **TypeScript Typecheck**: `pnpm typecheck`
- **Lint Codebase**: `pnpm lint`
- **Run Unit Tests**: `pnpm test`
- **Build Production App**: `pnpm build`

Fallback forms:

```bash
corepack pnpm validate:data
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build
```

## Dataset Contributions

Country datasets live under `data/<country>/`. CardPin currently includes:

- `data/be/`
- `data/de/`
- `data/nl/`
- `data/us/` (166 cards, no merchants yet; contributions of US merchants are welcome)

Each country dataset contains:

- `issuers.json`
- `cards.json`
- `merchants.json`
- `reward_rules.json`

Use stable lowercase kebab-case IDs. Use uppercase ISO country codes in data fields. Keep merchant categories consistent so existing reward rules continue to match; categories must come from the registry in `packages/schemas/src/index.ts`. Cards default to `currency: "EUR"`, so set `currency` (e.g. `USD`) for any other currency.

## Easiest First Contributions

- Run `pnpm check:stale` to list reward rules not re-verified in 180 days. Re-check one against its source, then bump `verifiedAt` and `verifiedBy`.
- Use the **Report wrong data** link in the app's result card; it opens a prefilled issue.
- Add a missing merchant to `merchants.json` (name, country, categories). No code needed.

## Data Verification Standards

CardPin data is community-sourced, so verification quality matters. Contributors must:

- Use official issuer, card product, merchant, or terms pages whenever possible.
- Prefer public HTTPS URLs that reviewers can access.
- Record the date the source was checked.
- Avoid guessing reward rates, fees, caps, exclusions, or eligibility rules.
- Leave data out when no reliable official source is available.
- Update stale `verifiedAt` dates only after re-checking the source.

## Reward Rule Source Requirements

Every reward rule must include a `source` object:

```json
{
  "source": {
    "sourceUrl": "https://www.example-bank.com/card-terms",
    "verifiedAt": "2026-06-14",
    "verifiedBy": "your-github-handle"
  }
}
```

Rules:

- `sourceUrl` must be an official public source for the reward rule.
- `verifiedAt` must be an ISO date in `YYYY-MM-DD` format.
- `verifiedBy` should be your GitHub handle.
- Reward values must match the cited source.
- If terms include caps, exclusions, merchant restrictions, audience restrictions, or validity windows, include them in the data when supported by the schema.

## Adding or Editing Data

To add an issuer, edit the relevant `issuers.json` file.

To add a card, edit `cards.json`, reference an existing issuer, and include required source proof.

To add a merchant, edit `merchants.json`, use a stable merchant ID, and choose categories that match the existing taxonomy.

To add a reward rule, edit `reward_rules.json`, reference an existing card, and include source attribution.

After data edits, run:

```bash
pnpm format:data
pnpm validate:data
pnpm compile:data
```

## Code Contributions

Keep code changes aligned with the static architecture:

- Recommendation logic belongs in `packages/engine/`.
- Data schemas belong in `packages/schemas/`.
- Web UI belongs in `apps/web/`.
- Avoid new external API calls, telemetry, account systems, or server-only features. The only allowed runtime request is the read-only exchange-rate fetch in `apps/web/src/lib/use-fx-rates.ts`.
- Add or update tests for recommendation behavior changes.
- Rewards are calculated in the country's base currency (`baseCurrencyFor()` in `apps/web/src/lib/utils.ts`): USD for `US`, EUR otherwise. Do not hard-code currency codes in the UI; use the card's `currency`.
- Update the docs (`README.md`, `RELEASE_CHECKLIST.md`) and bump the version in `package.json` and `apps/web/package.json` when behavior changes.

## Pull Request Checklist

Before requesting review, confirm:

- `pnpm format:data` was run to sort and clean JSON files.
- `pnpm validate:data` passes (validates schema, relational integrity, duplicates, and formatting).
- `pnpm typecheck` passes.
- `pnpm lint` passes.
- `pnpm test` passes.
- `pnpm build` passes.
- Dataset changes include official source attribution.
- Reward values match cited sources.
- No generated build output is committed.
- No backend, auth, database, or server-side service was introduced.

## Disclaimer

CardPin is not financial advice. See [DISCLAIMER.md](DISCLAIMER.md).
