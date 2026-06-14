import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const DATA_DIR = path.join(repoRoot, "data");

function sortAndFormatJsonFile(filePath: string, arrayKey: string) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(content);
  if (!parsed || !Array.isArray(parsed[arrayKey])) {
    return;
  }

  // Sort array by id
  parsed[arrayKey].sort((a: any, b: any) => {
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  });

  const formatted = JSON.stringify(parsed, null, 2) + "\n";
  fs.writeFileSync(filePath, formatted, "utf-8");
}

function main() {
  const countries = fs
    .readdirSync(DATA_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const countryCode of countries) {
    const countryDir = path.join(DATA_DIR, countryCode);
    sortAndFormatJsonFile(path.join(countryDir, "issuers.json"), "issuers");
    sortAndFormatJsonFile(path.join(countryDir, "cards.json"), "cards");
    sortAndFormatJsonFile(path.join(countryDir, "merchants.json"), "merchants");
    sortAndFormatJsonFile(path.join(countryDir, "reward_rules.json"), "rewardRules");
    console.log(`[format-datasets] Formatted and sorted dataset files for country: ${countryCode.toUpperCase()}`);
  }
}

main();
