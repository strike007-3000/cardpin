# CardPin Release Checklist (v1.2.0)

This checklist outlines the steps required to validate, deploy, and tag a release of CardPin.

## 1. Local Validation Commands

Before pushing any release candidates to git, run the following validation suite locally. All commands must complete with exit code `0`.

```bash
# 1. Validate Zod schemas and relational integrity
pnpm validate:data

# 2. Verify all database URLs/sources are online
npx tsx scripts/check-links.ts

# 3. TypeScript typecheck
pnpm typecheck

# 4. Lint the codebase
pnpm lint

# 5. Run unit tests
pnpm test

# 6. Build production static bundle (compiles data and builds Next.js export)
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

1. **First Run**: Open the page in a clean/incognito browser window. Check that the welcome banner is visible, the default spend input is set to `50` inside the `EUR` prefix field, and the empty states show Credit Card placeholder icons.
2. **Welcome Banner Dismissal**:
   * Click "How it works & Data transparency" in the banner. Verify the details grid expands.
   * Click "Hide details". Verify it collapses.
   * Click the "&times;" dismiss button. Verify the banner disappears.
   * Refresh the page. Verify the banner remains dismissed (preference saved in `localStorage`).
3. **Country & Audience Selection**:
   * Switch between Belgium and Germany. Verify cards and catalog reload.
   * Switch between Personal and Business. Verify business-only cards are loaded.
4. **Card Catalog Modal**:
   * Click **+ Add Cards**. Check that the searchable modal catalog opens.
   * Search for a card name. Check that list matches.
   * Select a card. Verify the badge changes to "In Wallet" and keyboard navigation (Tab/Enter/Space) works correctly on card buttons.
5. **Horizontal Card Scroll & Selection**:
   * Verify that selected cards are displayed as a horizontal fanned deck.
   * Scroll horizontally to make sure all cards are accessible.
   * Click a card. Verify it displays a blue border highlight (`active-card-highlight`) and displays the **Selected Card Settings** section below the deck.
6. **Earning Caps & Monthly Spent Budget**:
   * Select a card with known reward caps.
   * Under **Selected Card Settings**, input a monthly spend value.
   * Search for a category and verify that the recommendation result applies correct reward caps (headroom calculation).
7. **Multi-Currency FX conversions**:
   * Change transaction currency to `USD` or `GBP`.
   * Check that live rates are fetched from Fawaz Ahmed API and stored in `sessionStorage`.
   * Verify the spend input prefix updates to the selected currency.
   * Verify that reward calculations (net of FX fees) are evaluated correctly.
8. **Offline PWA Support**:
   * Install the app as a PWA or turn on offline mode in DevTools Network tab.
   * Refresh the page. Verify that the app shell loads fully offline and recommendations continue to calculate.
9. **Local Developer Panel**:
   * Add `?dev=true` to the URL.
   * Verify the **🔧 Dev Tools** floating trigger button appears at the bottom-right corner.
   * Click it to open the bulk importer modal. Test merging cards/issuers JSON content.

## 4. Known Limitations

* **Country Coverage**: Supports Belgium (BE), Germany (DE), and Netherlands (NL).
* **Valuations**: Points/miles are valued at a static valuation of `1` (1 cent per point/mile) for simplicity; dynamic sliders are not implemented.
* **Architecture**: Fully static, local-only calculations. No user account syncing, transaction tracking, or server integrations.

## 5. Release Tagging Steps

Once validation passes and smoke tests succeed:

1. Ensure the working directory is clean:
   ```bash
   git status
   ```
2. Create and push the release tag:
   ```bash
   git tag -a v1.0.0 -m "Release v1.0.0"
   git push origin v1.0.0
   ```
