# Contributing to CardPin

Thank you for helping improve CardPin. This project is a static-first, privacy-focused payment card reward helper, so contributions should preserve the current architecture: no backend, no authentication, no database, and no server-side recommendation service.

## Development Workflow

### Prerequisites

- **Node.js**: Version `20` (LTS is recommended. A `.nvmrc` is provided).
- **Corepack**: Required to manage the package manager version automatically.

### Installation & Development

This project uses the package manager declared in `package.json`:

```json
"packageManager": "pnpm@9.0.0"
```

To set up the project locally:

1. Ensure you are using Node.js 20.
2. Enable Corepack and activate the configured `pnpm` version:
   ```bash
   corepack enable
   corepack prepare pnpm@9.0.0 --activate
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

- **Validate Datasets**: `pnpm validate:data` (checks schemas and relationships without writing compiled bundles)
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
- `data/nl/`

Each country dataset contains:

- `issuers.json`
- `cards.json`
- `merchants.json`
- `reward_rules.json`

Use stable lowercase kebab-case IDs. Use uppercase ISO country codes in data fields. Keep merchant categories consistent so existing reward rules continue to match.

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
pnpm validate:data
pnpm compile:data
```

## Code Contributions

Keep code changes aligned with the static architecture:

- Recommendation logic belongs in `packages/engine/`.
- Data schemas belong in `packages/schemas/`.
- Web UI belongs in `apps/web/`.
- Avoid external API calls, telemetry, account systems, or server-only features.
- Add or update tests for recommendation behavior changes.

## Pull Request Checklist

Before requesting review, confirm:

- `pnpm validate:data` passes.
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
