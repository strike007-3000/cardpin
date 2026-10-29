# CardPin Release Checklist (v1.2.18)

This checklist outlines the steps required to validate, deploy, and tag a release of CardPin.

## 1. Local Validation Commands

Before pushing any release candidates to git, run the following validation suite locally. All commands must complete with exit code `0`.

```bash
# 1. Validate Zod schemas and relational integrity
pnpm validate:data

# 2. Verify all database URLs/sources are online (all country datasets; the US dataset has hundreds of URLs)
npx tsx scripts/check-links.ts

# 2b. List reward rules not re-verified in 180 days
pnpm check:stale

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
  * `NODE_VERSION`: `24`
  * `PNPM_VERSION`: `10.34.4`
  
*Note: If for any reason the root build script does not compile the datasets, you can use `pnpm compile:data && pnpm build` as a fallback build command.*

## 3. Manual Smoke Test Cases

After building locally or deploying to a preview environment, verify the following core features:

1. **First Run**: Open the page in a clean/incognito browser window. Check that the welcome banner is visible, the default spend input is set to `50` inside the base-currency prefix field (`EUR`, or `USD` for the United States), and the empty states show Credit Card placeholder icons.
2. **Welcome Banner Dismissal**:
   * Click "How it works & Data transparency" in the banner. Verify the details grid expands.
   * Click "Hide details". Verify it collapses.
   * Click the "&times;" dismiss button. Verify the banner disappears.
   * Refresh the page. Verify the banner remains dismissed (preference saved in `localStorage`).
3. **Country & Audience Selection**:
   * Switch between Belgium, Germany, Netherlands, and United States. Verify cards and catalog reload, and that the spend currency, reward labels and catalog fees switch to `USD` for the United States and `EUR` elsewhere.
   * Switch between Personal and Business. Verify business-only cards are loaded.
4. **Card Catalog Modal**:
   * Click **+ Add Cards**. Check that the searchable modal catalog opens.
   * Search for a card name. Check that list matches.
   * Select a card. Verify the badge changes to "In Wallet" and keyboard navigation (Tab/Enter/Space) works correctly on card buttons.
5. **Wallet Card Stack & Selection**:
   * Verify that owned cards form a vertical stack with one fully expanded card and a visible header for each collapsed card.
   * Click a collapsed card. Verify it moves to the front, expands, and shows its monthly spend input and remove button.
   * Open the **•••** wallet options menu and verify import, export and clear actions.
6. **Earning Caps & Monthly Spent Budget**:
   * Select a card with known reward caps.
   * In the expanded card, input a "Spent this month" value.
   * Search for a category and verify that the recommendation result applies correct reward caps (headroom calculation).
   * Verify the value is stored under `cardpin:monthly_spend:<YYYY-MM>:<cardId>`; a value saved for a previous month must not flag the card as capped.
7. **Multi-Currency FX conversions**:
   * Change transaction currency to one other than the country base (e.g. `USD`, `GBP` or `JPY` for EUR countries; `EUR` for the US).
   * Check that live rates are fetched from Fawaz Ahmed API and stored in `sessionStorage`.
   * Clear the FX cache, block the rate request, and verify recommendations stay hidden instead of treating the foreign amount as base-currency spend.
   * Verify the spend input prefix updates to the selected currency.
   * Verify that reward calculations (net of FX fees) are evaluated correctly.
8. **Offline PWA Support**:
   * Install the app as a PWA or turn on offline mode in DevTools Network tab.
   * Refresh the page. Verify that the app shell loads fully offline and recommendations continue to calculate.
9. **Points & Miles Valuation**:
   * With a points or miles card and a cashback card in the wallet, verify the points card does not win just because its raw number is larger.
   * Change **1 point / mile ≈** in the wallet panel and verify ranking updates and the choice survives a reload.
10. **Amex Fallback & Unlock Banner**:
   * With an Amex card as the best result, verify the "Amex not accepted?" line names the best non-Amex alternative.
   * Verify the "Next Card to Unlock" banner shows the annual fee in the card's currency.
11. **Mobile Merchant Suggestions**:
   * At a phone width (375px), type in the Merchant field and verify the suggestion list appears directly under the input, fits the screen, and tapping an item fills the field.
12. **Local Developer Panel**:
   * Add `?dev=true` to the URL.
   * Verify the **🔧 Dev Tools** floating trigger button appears at the bottom-right corner.
   * Click it to open the bulk importer modal. Test merging cards/issuers JSON content.

## 4. Known Limitations

* **Country Coverage**: Supports Belgium (BE), Germany (DE), Netherlands (NL), and United States (US).
* **Valuations**: Points/miles use one user-selected value per point/mile (0.5¢ to 2¢, default 1¢) for all programs; per-program valuations are not implemented.
* **Base currency**: USD for the United States, EUR for all other countries; the country-to-currency mapping is hard-coded in `baseCurrencyFor()`.
* **Merchant suggestions**: the custom list supports touch and mouse but not arrow-key navigation.
* **Architecture**: Fully static, local-only calculations. No user account syncing, transaction tracking, or server integrations.

## 5. Release Tagging Steps

Once validation passes and smoke tests succeed:

1. Ensure the working directory is clean:
   ```bash
   git status
   ```
2. Create and push the release tag:
   ```bash
   git tag -a v<version> -m "Release v<version>"   # e.g. v1.2.18
   git push origin v<version>
   ```
