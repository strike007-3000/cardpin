import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const US_DIR = path.join(repoRoot, "data", "us");
const CSV_PATH = path.join(US_DIR, "raw_import.csv");

function toKebabCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function isMilesCurrency(curr: string): boolean {
  const milesCurrencies = ["DELTA", "UNITED", "AMERICAN_AIRLINES", "ALASKA", "SOUTHWEST", "JETBLUE", "HAWAIIAN", "AVIANCA", "EMIRATES", "VIRGIN_ATLANTIC"];
  return milesCurrencies.includes(curr.toUpperCase());
}

function main() {
  if (!fs.existsSync(CSV_PATH)) {
    throw new Error(`CSV file not found at ${CSV_PATH}`);
  }

  const csvContent = fs.readFileSync(CSV_PATH, "utf-8");
  const lines = csvContent.split(/\r?\n/).filter((line: string) => line.trim().length > 0);
  if (lines.length === 0) {
    throw new Error("CSV file is empty");
  }

  const headers = parseCSVLine(lines[0]);
  const rows = lines.slice(1).map(parseCSVLine);

  const issuersMap = new Map<string, { id: string; name: string }>();
  const cardsMap = new Map<string, any>();
  const rewardRulesList: any[] = [];
  const seenRuleIds = new Set<string>();

  const todayStr = "2026-07-23";

  for (const row of rows) {
    if (row.length < 10) continue;

    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = row[idx] ?? "";
    });

    const rawIssuer = rowObj.issuer || "Unknown Issuer";
    const issuerId = toKebabCase(rawIssuer.replace(/_/g, " "));
    const issuerName = rawIssuer.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

    if (!issuersMap.has(issuerId)) {
      issuersMap.set(issuerId, { id: issuerId, name: issuerName });
    }

    const rawName = rowObj.name || "Unknown Card";
    const rawCardId = rowObj.cardId ? rowObj.cardId.slice(0, 6) : "";
    const cardId = toKebabCase(`${issuerId}-${rawName}${rawCardId ? "-" + rawCardId : ""}`);
    const network = toKebabCase(rowObj.network || "visa");
    const isBusiness = rowObj.isBusiness === "true";
    const annualFee = parseFloat(rowObj.annualFee) || 0;
    const universalCashbackPercent = parseFloat(rowObj.universalCashbackPercent) || 0;
    const cardUrl = rowObj.url && rowObj.url.startsWith("https://") ? rowObj.url : "https://github.com/andenacitelli/credit-card-bonuses-api";
    const currencyRaw = (rowObj.currency || "USD").toUpperCase();

    if (!cardsMap.has(cardId)) {
      cardsMap.set(cardId, {
        id: cardId,
        name: rawName,
        issuerId,
        country: "US",
        network: network.includes("american") ? "amex" : network,
        annualFee,
        fxFeePercentage: 0,
        currency: "USD",
        rewardRules: [],
        source: "community",
        audience: isBusiness ? "business" : "consumer",
        sourceProof: {
          sourceUrl: cardUrl,
          verifiedAt: todayStr,
          verifiedBy: "community"
        },
        lastUpdated: todayStr
      });
    }

    const cardRef = cardsMap.get(cardId);

    // 1. Base rule (omitting category so it acts as true fallback rule in evaluateCardForSpend)
    const baseRuleId = toKebabCase(`${cardId}-base-rule`);
    if (universalCashbackPercent > 0 && !seenRuleIds.has(baseRuleId)) {
      seenRuleIds.add(baseRuleId);
      cardRef.rewardRules.push(baseRuleId);

      const isCash = currencyRaw === "USD";
      const isMiles = isMilesCurrency(currencyRaw);

      rewardRulesList.push({
        id: baseRuleId,
        cardId,
        country: "US",
        rewardType: isCash ? "cashback_percentage" : isMiles ? "miles" : "points",
        rewardValue: isCash ? universalCashbackPercent / 100 : universalCashbackPercent,
        conditions: {},
        source: {
          sourceUrl: cardUrl,
          verifiedAt: todayStr,
          verifiedBy: "community"
        },
        lastUpdated: todayStr
      });
    }

    // 2. Welcome bonus offer rule if present
    const offerAmount = parseFloat(rowObj.offerAmount) || 0;
    const offerSpend = parseFloat(rowObj.offerSpend) || 0;
    const offerUrl = rowObj.offerUrl && rowObj.offerUrl.startsWith("https://") ? rowObj.offerUrl : cardUrl;

    if (offerAmount > 0 && offerSpend > 0) {
      const offerRuleId = toKebabCase(`${cardId}-welcome-offer-${Math.round(offerSpend)}`);
      if (!seenRuleIds.has(offerRuleId)) {
        seenRuleIds.add(offerRuleId);
        cardRef.rewardRules.push(offerRuleId);

        const isCash = currencyRaw === "USD";
        const isMiles = isMilesCurrency(currencyRaw);

        rewardRulesList.push({
          id: offerRuleId,
          cardId,
          country: "US",
          rewardType: isCash ? "fixed_cashback" : isMiles ? "miles" : "points",
          rewardValue: offerAmount,
          conditions: {
            minSpend: offerSpend
          },
          source: {
            sourceUrl: offerUrl,
            verifiedAt: todayStr,
            verifiedBy: "community"
          },
          lastUpdated: todayStr
        });
      }
    }
  }

  // Sort datasets by ID
  const issuers = Array.from(issuersMap.values()).sort((a, b) => a.id.localeCompare(b.id));
  const cards = Array.from(cardsMap.values()).sort((a, b) => a.id.localeCompare(b.id));
  const rewardRules = rewardRulesList.sort((a, b) => a.id.localeCompare(b.id));
  const merchants: any[] = [];

  fs.writeFileSync(path.join(US_DIR, "issuers.json"), JSON.stringify({ issuers }, null, 2) + "\n");
  fs.writeFileSync(path.join(US_DIR, "cards.json"), JSON.stringify({ cards }, null, 2) + "\n");
  fs.writeFileSync(path.join(US_DIR, "merchants.json"), JSON.stringify({ merchants }, null, 2) + "\n");
  fs.writeFileSync(path.join(US_DIR, "reward_rules.json"), JSON.stringify({ rewardRules }, null, 2) + "\n");

  console.log(`[import-us-csv] Ingested ${issuers.length} issuers, ${cards.length} cards, and ${rewardRules.length} reward rules into data/us/`);
}

main();
