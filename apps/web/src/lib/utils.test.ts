import { describe, expect, it } from "vitest";
import { needsFxRates } from "./utils";

describe("needsFxRates", () => {
  it("does not request rates for euro transactions", () => {
    expect(needsFxRates("EUR")).toBe(false);
    expect(needsFxRates("eur")).toBe(false);
  });

  it("requests rates for supported foreign currencies", () => {
    expect(needsFxRates("USD")).toBe(true);
    expect(needsFxRates("GBP")).toBe(true);
    expect(needsFxRates("CHF")).toBe(true);
    expect(needsFxRates("JPY")).toBe(true);
  });
});
