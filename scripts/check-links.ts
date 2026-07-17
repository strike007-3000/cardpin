import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const targetDirs = ["be", "de", "nl"];

async function checkUrl(url: string): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    });
    if (res.ok) return { success: true, status: res.status };
    
    if (res.status === 405 || res.status === 403) {
      const getRes = await fetch(url, {
        method: "GET",
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
      });
      return { success: getRes.ok, status: getRes.status };
    }
    return { success: false, status: res.status };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function main() {
  console.log("[check-links] Starting source URL link scanner...");
  const urlsToCheck: { url: string; file: string }[] = [];

  for (const country of targetDirs) {
    const dataDir = path.join(repoRoot, "data", country);
    if (!fs.existsSync(dataDir)) continue;

    const files = fs.readdirSync(dataDir);
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const filePath = path.join(dataDir, file);
      const content = fs.readFileSync(filePath, "utf8");
      try {
        const json = JSON.parse(content);
        const fileBase = file.replace(".json", "");
        const arrayKey = fileBase === "reward_rules" ? "rewardRules" : fileBase;
        const items = Array.isArray(json[arrayKey]) ? json[arrayKey] : [];

        for (const item of items) {
          if (item.source && item.source.startsWith("http")) {
            urlsToCheck.push({ url: item.source, file: path.relative(repoRoot, filePath) });
          }
          if (item.sourceProof && typeof item.sourceProof.sourceUrl === "string" && item.sourceProof.sourceUrl.startsWith("http")) {
            urlsToCheck.push({ url: item.sourceProof.sourceUrl, file: path.relative(repoRoot, filePath) });
          }
        }
      } catch (e) {
        // Skip invalid JSON
      }
    }
  }

  const uniqueUrls = Array.from(new Map(urlsToCheck.map(item => [item.url, item])).values());
  console.log(`[check-links] Found ${uniqueUrls.length} unique URLs to verify.`);

  let brokenCount = 0;
  for (const { url, file } of uniqueUrls) {
    const result = await checkUrl(url);
    if (result.success) {
      console.log(`✅ [OK] ${result.status} - ${url} (referenced in ${file})`);
    } else {
      brokenCount++;
      console.warn(`❌ [BROKEN] ${result.error || `Status ${result.status}`} - ${url} (referenced in ${file})`);
    }
  }

  if (brokenCount > 0) {
    console.warn(`\n[check-links] Scanning complete. Found ${brokenCount} broken link(s).`);
  } else {
    console.log("\n[check-links] All links are healthy!");
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
