import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

describe("CSS variables in globals.css", () => {
  it("defines core fintech colors and gradients", () => {
    const cssPath = join(__dirname, "../app/globals.css");
    const content = readFileSync(cssPath, "utf-8");

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
    expect(content).toContain(".redesigned-grid-container {");
    expect(content).toContain(".compact-controls-strip {");
  });
});
