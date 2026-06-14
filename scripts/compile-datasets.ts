import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CountryIssuersJsonSchema,
  CountryCardsJsonSchema,
  CountryMerchantsJsonSchema,
  CountryRewardRulesJsonSchema,
  CountryDatasetSchema
} from "../packages/schemas/src/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const DATA_DIR = path.join(repoRoot, "data");
const OUT_DIR = path.join(repoRoot, "apps", "web", "public", "data");

const validateOnly = process.argv.includes("--validate-only");

function assertExists(filePath: string) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required file: ${filePath}`);
  }
}

function checkFormattingAndSorting(filePath: string, arrayKey: string) {
  const content = fs.readFileSync(filePath, "utf-8");
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    throw new Error(`Syntax Error: File ${filePath} is not valid JSON.`);
  }

  if (!parsed || !Array.isArray(parsed[arrayKey])) {
    throw new Error(`Invalid schema structure: File ${filePath} missing array key "${arrayKey}".`);
  }

  const items = parsed[arrayKey];

  // Check duplicate IDs
  const seenIds = new Set<string>();
  for (const item of items) {
    if (!item.id || typeof item.id !== "string") {
      throw new Error(`Duplicate ID/Schema Error: Item in ${filePath} is missing a valid string ID.`);
    }
    if (seenIds.has(item.id)) {
      throw new Error(`Duplicate ID Error: ID "${item.id}" is defined multiple times in ${filePath}`);
    }
    seenIds.add(item.id);
  }

  // Check sorting
  for (let i = 0; i < items.length - 1; i++) {
    if (items[i].id > items[i + 1].id) {
      throw new Error(
        `Dataset Format Error: File ${filePath} is not sorted alphabetically by ID.\n` +
        `Line with ID "${items[i + 1].id}" should come before "${items[i].id}".\n` +
        `Please run 'pnpm format:data' to fix automatically.`
      );
    }
  }

  // Check pretty-printing format
  const expectedContent = JSON.stringify(parsed, null, 2) + "\n";
  if (content !== expectedContent) {
    throw new Error(
      `Dataset Format Error: File ${filePath} is not formatted correctly.\n` +
      `Please run 'pnpm format:data' to format and clean files automatically.`
    );
  }
}

function validateSourceAttribution(source: { sourceUrl: string; verifiedAt: string; verifiedBy: string }, locationInfo: string) {
  if (!source.sourceUrl.startsWith("https://")) {
    throw new Error(`[Attribution Error] ${locationInfo}: Source URL must use HTTPS (secured)`);
  }
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(source.verifiedAt)) {
    throw new Error(`[Attribution Error] ${locationInfo}: Verified date "${source.verifiedAt}" must be in YYYY-MM-DD format`);
  }
  const timestamp = Date.parse(source.verifiedAt);
  if (Number.isNaN(timestamp)) {
    throw new Error(`[Attribution Error] ${locationInfo}: Verified date "${source.verifiedAt}" is not a valid date`);
  }
  const dateObj = new Date(source.verifiedAt);
  const now = new Date();
  if (dateObj.getTime() > now.getTime() + 86400000) {
    throw new Error(`[Attribution Error] ${locationInfo}: Verified date "${source.verifiedAt}" cannot be in the future`);
  }
}

async function main() {
  const countries = fs
    .readdirSync(DATA_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  if (!validateOnly) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  for (const countryCode of countries) {
    const uppercaseCountry = countryCode.toUpperCase();
    const countryDir = path.join(DATA_DIR, countryCode);

    const issuersPath = path.join(countryDir, "issuers.json");
    const cardsPath = path.join(countryDir, "cards.json");
    const merchantsPath = path.join(countryDir, "merchants.json");
    const rewardRulesPath = path.join(countryDir, "reward_rules.json");

    assertExists(issuersPath);
    assertExists(cardsPath);
    assertExists(merchantsPath);
    assertExists(rewardRulesPath);

    // Enforce sorting, duplicate checks, and formatting verification
    checkFormattingAndSorting(issuersPath, "issuers");
    checkFormattingAndSorting(cardsPath, "cards");
    checkFormattingAndSorting(merchantsPath, "merchants");
    checkFormattingAndSorting(rewardRulesPath, "rewardRules");

    const issuersJsonRaw = JSON.parse(fs.readFileSync(issuersPath, "utf-8"));
    const cardsJsonRaw = JSON.parse(fs.readFileSync(cardsPath, "utf-8"));
    const merchantsJsonRaw = JSON.parse(fs.readFileSync(merchantsPath, "utf-8"));
    const rewardRulesJsonRaw = JSON.parse(fs.readFileSync(rewardRulesPath, "utf-8"));

    const issuersParsed = CountryIssuersJsonSchema.parse(issuersJsonRaw).issuers;
    const cardsParsed = CountryCardsJsonSchema.parse(cardsJsonRaw).cards;
    const merchantsParsed = CountryMerchantsJsonSchema.parse(merchantsJsonRaw).merchants;
    const rewardRulesParsed = CountryRewardRulesJsonSchema.parse(rewardRulesJsonRaw).rewardRules;

    const issuerIds = new Set(issuersParsed.map((i) => i.id));
    const cardIds = new Set(cardsParsed.map((c) => c.id));
    const merchantIds = new Set(merchantsParsed.map((m) => m.id));

    // Relational Integrity and Country Matching Validations
    for (const card of cardsParsed) {
      if (card.country !== uppercaseCountry) {
        throw new Error(
          `Relational Integrity Error: Card "${card.id}" country "${card.country}" does not match dataset country "${uppercaseCountry}".`
        );
      }
      if (!issuerIds.has(card.issuerId)) {
        throw new Error(
          `Relational Integrity Error: Card "${card.id}" references non-existent issuerId "${card.issuerId}".`
        );
      }
      if (card.sourceProof) {
        validateSourceAttribution(card.sourceProof, `Card "${card.id}" source proof`);
      }
    }

    for (const merchant of merchantsParsed) {
      if (merchant.country !== uppercaseCountry) {
        throw new Error(
          `Relational Integrity Error: Merchant "${merchant.id}" country "${merchant.country}" does not match dataset country "${uppercaseCountry}".`
        );
      }
    }

    for (const rule of rewardRulesParsed) {
      if (rule.country !== uppercaseCountry) {
        throw new Error(
          `Relational Integrity Error: RewardRule "${rule.id}" country "${rule.country}" does not match dataset country "${uppercaseCountry}".`
        );
      }

      if (!cardIds.has(rule.cardId)) {
        throw new Error(
          `Relational Integrity Error: RewardRule "${rule.id}" references non-existent cardId "${rule.cardId}".`
        );
      }

      if (rule.merchantId && !merchantIds.has(rule.merchantId)) {
        throw new Error(
          `Relational Integrity Error: RewardRule "${rule.id}" references non-existent merchantId "${rule.merchantId}".`
        );
      }

      validateSourceAttribution(rule.source, `RewardRule "${rule.id}" source`);
    }

    // Full bundle validation
    const dataset = CountryDatasetSchema.parse({
      country: uppercaseCountry,
      issuers: issuersParsed,
      cards: cardsParsed,
      merchants: merchantsParsed,
      rewardRules: rewardRulesParsed
    });

    if (!validateOnly) {
      const outPath = path.join(OUT_DIR, `${countryCode.toLowerCase()}.json`);
      fs.writeFileSync(outPath, JSON.stringify(dataset, null, 2));
      console.log(`[compile-datasets] Compiled and wrote ${outPath}`);
    } else {
      console.log(`[compile-datasets] Successfully validated "${uppercaseCountry}" dataset.`);
    }
  }
}

main().catch((err) => {
  console.error("Compilation/Validation failed!");
  console.error(err);
  process.exit(1);
});
