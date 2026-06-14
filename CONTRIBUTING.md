# Contributing to CardPin

Thank you for helping improve CardPin. This project is a static-first, privacy-focused payment card reward helper, so contributions should preserve the current architecture: no backend, no authentication, no database, and no server-side recommendation service.

## Development Workflow

Install dependencies:

```bash
pnpm install
```

Validate dataset changes without writing compiled bundles:

```bash
pnpm validate:data
```

Compile validated datasets for the web app:

```bash
pnpm compile:data
```

Run the main checks before opening a pull request:

```bash
pnpm validate:data
pnpm typecheck
pnpm lint
pnpm test
pnpm build
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
