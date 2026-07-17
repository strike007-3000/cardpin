import { spawn } from "node:child_process";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

// 1. Create and start HTTP Dev Server on 3001
const devServer = http.createServer((req, res) => {
  // CORS Headers for local communication from next dev app
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === "POST" && req.url === "/api/update-data") {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", () => {
      try {
        const { country, dataType, data } = JSON.parse(body);

        if (!country || !dataType || !data) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing parameters" }));
          return;
        }

        const allowedCountries = ["be", "de", "nl"];
        const allowedDataTypes = ["issuers", "cards", "merchants", "rewardRules"];

        if (!allowedCountries.includes(country.toLowerCase()) || !allowedDataTypes.includes(dataType)) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid parameter values" }));
          return;
        }

        const fileName = dataType === "rewardRules" ? "reward_rules" : dataType;
        const dataFilePath = path.join(repoRoot, "data", country.toLowerCase(), `${fileName}.json`);

        if (!fs.existsSync(dataFilePath)) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: `File not found: ${dataFilePath}` }));
          return;
        }

        const fileContent = fs.readFileSync(dataFilePath, "utf8");
        const currentJson = JSON.parse(fileContent);

        const arrayKey = dataType === "rewardRules" ? "rewardRules" : dataType;
        if (!currentJson || !Array.isArray(currentJson[arrayKey])) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: `Invalid file structure in ${fileName}.json` }));
          return;
        }

        const currentArray = currentJson[arrayKey];
        const incomingItems = Array.isArray(data) ? data : [data];

        for (const incoming of incomingItems) {
          if (!incoming.id) continue;
          const index = currentArray.findIndex((item: any) => item.id === incoming.id);
          if (index !== -1) {
            currentArray[index] = { ...currentArray[index], ...incoming };
          } else {
            currentArray.push(incoming);
          }
        }

        fs.writeFileSync(dataFilePath, JSON.stringify(currentJson, null, 2) + "\n", "utf8");

        try {
          execSync("npx pnpm format:data", { cwd: repoRoot, stdio: "ignore" });
          execSync("npx pnpm compile:data", { cwd: repoRoot, stdio: "ignore" });
        } catch (cmdErr: any) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Compilation failed after saving", details: cmdErr.message }));
          return;
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true }));
      } catch (err: any) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

devServer.listen(3001, "127.0.0.1", () => {
  console.log("[dev-server] Local Update Data API running on http://127.0.0.1:3001");
});

// 2. Spawn Next.js dev server
const nextDev = spawn("npx", ["next", "dev"], {
  cwd: __dirname,
  stdio: "inherit",
  shell: true
});

nextDev.on("close", (code) => {
  devServer.close();
  process.exit(code ?? 0);
});

process.on("SIGINT", () => {
  nextDev.kill();
  devServer.close();
  process.exit(0);
});
