import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const { country, dataType, data } = await request.json();

    if (!country || !dataType || !data) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // Resolve repository root
    let repoRoot = process.cwd();
    while (repoRoot !== "/" && !fs.existsSync(path.join(repoRoot, "pnpm-workspace.yaml"))) {
      const parent = path.dirname(repoRoot);
      if (parent === repoRoot) break;
      repoRoot = parent;
    }

    const dataFilePath = path.join(repoRoot, "data", country.toLowerCase(), `${dataType}.json`);

    if (!fs.existsSync(dataFilePath)) {
      return NextResponse.json({ error: `File not found: ${dataFilePath}` }, { status: 404 });
    }

    // Read current data
    const fileContent = fs.readFileSync(dataFilePath, "utf8");
    const currentJson = JSON.parse(fileContent);

    // Ensure we have an array for the specified array key
    const arrayKey = dataType === "rewardRules" ? "rewardRules" : dataType;
    if (!currentJson || !Array.isArray(currentJson[arrayKey])) {
      return NextResponse.json({ error: `Invalid file structure in ${dataType}.json` }, { status: 500 });
    }

    const currentArray = currentJson[arrayKey];
    const incomingItems = Array.isArray(data) ? data : [data];

    // Merge incoming items (match by id)
    for (const incoming of incomingItems) {
      if (!incoming.id) continue;
      const index = currentArray.findIndex((item: any) => item.id === incoming.id);
      if (index !== -1) {
        currentArray[index] = { ...currentArray[index], ...incoming };
      } else {
        currentArray.push(incoming);
      }
    }

    // Write back to file
    fs.writeFileSync(dataFilePath, JSON.stringify(currentJson, null, 2) + "\n", "utf8");

    // Execute format and compilation scripts programmatically
    try {
      execSync("npx pnpm format:data", { cwd: repoRoot, stdio: "ignore" });
      execSync("npx pnpm compile:data", { cwd: repoRoot, stdio: "ignore" });
    } catch (cmdErr: any) {
      return NextResponse.json({
        error: "Compilation failed after saving files",
        details: cmdErr.message
      }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
