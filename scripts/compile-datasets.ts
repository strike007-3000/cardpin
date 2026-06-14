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
