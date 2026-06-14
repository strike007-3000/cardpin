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

1. **First Run**: Open the page in a clean/incognito browser window. Check that the "💡 Select cards in your wallet..." summary banner is visible, the default spend input is set to `50` inside the `EUR` prefix field, and the empty states show Credit Card placeholder icons.
2. **Welcome Banner Dismissal**:
   * Click "How it works & Data transparency" in the banner. Verify the details grid expands.
   * Click "Hide details". Verify it collapses.
   * Click the "&times;" dismiss button. Verify the banner disappears.
   * Refresh the page. Verify the banner remains dismissed (preference saved in `localStorage`).
3. **Country & Audience Selection**:
   * Switch between Belgium and Netherlands. Verify cards and accordion sections reload.
   * Switch between Personal and Business. Verify business-only card accordions are shown.
4. **Card Search & Accordion Selection**:
   * Expand/collapse an issuer group accordion.
   * Type a card or bank name in the card search box. Verify the accordion list filters in real-time.
   * Tick a card. Verify the selected count pill at the top of Step 2 increments.
   * Click "Clear" on the right of the search input. Verify all selected cards are unchecked.
   * Reload the page. Verify selected cards are preserved (using `localStorage`).
5. **Merchant Search / Category Selection**:
   * Type a merchant (e.g., `Carrefour` in Belgium, `Albert Heijn` in Netherlands) or select a category (e.g., `groceries`).
   * Verify the recommendation result card renders with a glowing border and green-highlighted net reward value.
   * Verify "Alternatives" are sorted correctly by net reward.
6. **Foreign Spend Switch**:
   * Slide the "Foreign currency spend" toggle switch to active.
   * Check that net rewards are adjusted downwards by the card's FX fee percentage.
7. **Data Transparency & Empty States**:
   * Verify empty search states display Credit Card placeholder icons.
   * Search a dummy merchant that doesn't exist (e.g. `Unicorn Shop`). Verify the empty state explains that no sourced rewards matched and warns to verify with issuer.

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
