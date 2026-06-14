# CardPin Release Checklist (v0.1.0-alpha)

This checklist outlines the steps required to validate, deploy, and tag a release of CardPin.

## 1. Local Validation Commands

Before pushing any release candidates to git, run the following validation suite locally. All commands must complete with exit code `0`.

```bash
# 1. Validate Zod schemas and relational integrity
pnpm validate:data

# 2. TypeScript typecheck
pnpm typecheck

# 3. Lint the codebase
pnpm lint

# 4. Run unit tests
pnpm test

# 5. Build production static bundle (compiles data and builds Next.js export)
pnpm build
```

## 2. Cloudflare Pages Deployment Settings

CardPin is a static-first application deployed to Cloudflare Pages. Use the following settings in the Cloudflare Dashboard:

* **Framework Preset**: `Next.js (Static HTML Export)`
* **Build Command**: `pnpm build`
* **Build Output Directory**: `apps/web/out`
* **Root Directory**: (Leave blank or set to project root `/`)
* **Environment Variables**:
  * `NODE_VERSION`: `20`
  * `PNPM_VERSION`: `9.0.0`
  
*Note: If for any reason the root build script does not compile the datasets, you can use `pnpm compile:data && pnpm build` as a fallback build command.*

## 3. Manual Smoke Test Cases

After building locally or deploying to a preview environment, verify the following core features:

1. **First Run**: Open the page in a clean/incognito browser window. Check that the "How it works" information is visible and the default spend input is set to `50`.
2. **Country & Audience Selection**:
   * Switch between Belgium and Netherlands. Verify that cards update accordingly.
   * Switch between Personal and Business. Verify that business cards are shown under Business.
3. **Card Selection**:
   * Verify that ticking cards saves them in the "Select Your Cards" section.
   * Verify that reload preserves selected cards (using `localStorage`).
4. **Merchant Search / Category Selection**:
   * Type a merchant (e.g. `Carrefour` in Belgium, `Albert Heijn` in Netherlands) or select a category (e.g. `groceries`).
   * Verify that the engine suggests the correct "Best card" and lists "Alternatives" sorted by net reward value.
5. **Foreign Spend & FX Fee**:
   * Tick "Foreign currency spend".
   * Check that net rewards are adjusted downwards by the card's FX fee.
6. **Data Transparency & Empty States**:
   * Verify the visibility of notes stating that data is community-sourced and that unsupported rewards are intentionally omitted.
   * Deselect all cards. Verify the empty state shows "Select your cards first."
   * Clear search and category. Verify the empty state shows "Search a merchant or choose a category."
   * Search a dummy merchant that doesn't exist (e.g. `Unicorn Shop`). Verify the message explains no sourced rewards matched and warns to verify with issuer.

## 4. Known Limitations

* **Country Coverage**: Supports Belgium (BE) and Netherlands (NL) only.
* **Reward Types**: Separately tracks points, miles, and cashback. Points/miles are valued at a static valuation of `1` (1 cent per point/mile) for simplicity; dynamic sliders are not implemented.
* **MCC Support**: Merchant categories are matched strictly via taxonomy; card-specific merchant classification codes (MCC) are not dynamically queried.
* **Architecture**: Fully static, local-only calculations. No user account syncing, transaction tracking, or server integrations.

## 5. Release Tagging Steps

Once validation passes and smoke tests succeed:

1. Ensure the working directory is clean:
   ```bash
   git status
   ```
2. Create and push the release tag:
   ```bash
   git tag -a v0.1.0-alpha -m "Release v0.1.0-alpha"
   git push origin v0.1.0-alpha
   ```
