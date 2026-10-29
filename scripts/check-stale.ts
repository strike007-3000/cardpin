import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const maxAgeDays = Number(process.argv[2] ?? 180);
const cutoff = Date.now() - maxAgeDays * 86_400_000;

let stale = 0;
for (const country of fs.readdirSync(path.join(root, "data"))) {
  const file = path.join(root, "data", country, "reward_rules.json");
  if (!fs.existsSync(file)) continue;
  const { rewardRules } = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const r of rewardRules) {
    if (Date.parse(r.source.verifiedAt) < cutoff) {
      stale++;
      console.log(`${country}/${r.id}  verified ${r.source.verifiedAt}  ${r.source.sourceUrl}`);
    }
  }
}
console.log(`\n${stale} rule(s) older than ${maxAgeDays} days. Re-check one against its source and bump verifiedAt.`);
