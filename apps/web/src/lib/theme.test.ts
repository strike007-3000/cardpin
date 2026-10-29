import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

describe("CSS variables in the global stylesheets", () => {
  it("defines core fintech colors and gradients", () => {
    const stylesDir = join(__dirname, "../styles");
    const content = readdirSync(stylesDir)
      .map((f) => readFileSync(join(stylesDir, f), "utf-8"))
      .join("\n");

    expect(content).toContain("--color-fintech-blue: #3b82f6;");
    expect(content).toContain("--color-fintech-purple: #8b5cf6;");
    expect(content).toContain("--color-fintech-green: #10b981;");
    expect(content).toContain("--color-fintech-orange: #f59e0b;");
    expect(content).toContain("--color-fintech-red: #ef4444;");

    expect(content).toContain("--gradient-card-bg");
    expect(content).toContain("--gradient-card-hover");
    expect(content).toContain("--gradient-primary");
    expect(content).toContain("--gradient-secondary");
    expect(content).toContain("--gradient-accent");
    expect(content).toContain(".visually-hidden");
    expect(content).toContain(".logo-header {");
    expect(content).toContain(".brand-name {");
    expect(content).toContain(".columns-grid {");
    expect(content).toContain(".compact-controls-strip {");
  });
});
