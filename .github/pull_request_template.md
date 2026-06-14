## Description

Please include a summary of the change and which issue is fixed (if applicable).
Specify if you are:
- [ ] Adding a new card
- [ ] Updating existing card fees/rewards
- [ ] Adding/updating merchant mapping
- [ ] Fixing codebase logic

## Contributor Checklist

Please verify that you have completed the following checks before requesting a review:

- [ ] **Formatting and Sorting**: I ran `pnpm format:data` to automatically sort the datasets by ID and format the JSON files.
- [ ] **Validation Suite**: I ran `pnpm validate:data` (or `corepack pnpm validate:data`) and verified it completed successfully with no formatting or schema errors.
- [ ] **Tests & Build Check**: I ran `pnpm test` and `pnpm build` locally, confirming all tests pass and static pages build successfully.
- [ ] **Country Matching**: All added items (issuers, cards, merchants, rules) have the correct uppercase ISO country code (e.g. `BE`, `NL`, `FR`, `DE`, `GB`).
- [ ] **Relational Integrity**: If I added a card or reward rule, all referenced IDs (e.g., `issuerId`, `cardId`, `merchantId`) exist in their respective JSON files.
- [ ] **Source Attribution**: Every new card and reward rule has a valid, official `sourceUrl` using HTTPS (no HTTP, no generic search engines, no third-party blogs).
