import { describe, expect, it } from "vitest";
import { getFxRate, needsFxRates, orderCardsForWalletStack } from "./utils";

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

describe("getFxRate", () => {
  const rates = { eur: 1, usd: 1.08, jpy: 170 };

  it("returns valid rates for supported currencies", () => {
    expect(getFxRate(rates, "EUR")).toBe(1);
    expect(getFxRate(rates, "JPY")).toBe(170);
  });

  it("rejects missing or invalid rates instead of treating them as euro", () => {
    expect(getFxRate(rates, "GBP")).toBeNull();
    expect(getFxRate({ jpy: 0 }, "JPY")).toBeNull();
    expect(getFxRate({ jpy: Number.NaN }, "JPY")).toBeNull();
  });
});

describe("orderCardsForWalletStack", () => {
  const cards = [{ id: "amex" }, { id: "visa" }, { id: "n26" }];

  it("places the selected card at the expanded front of the stack", () => {
    expect(orderCardsForWalletStack(cards, "visa").map((card) => card.id)).toEqual(["amex", "n26", "visa"]);
  });

  it("keeps the existing order when there is no valid selection", () => {
    expect(orderCardsForWalletStack(cards, null)).toBe(cards);
    expect(orderCardsForWalletStack(cards, "missing")).toBe(cards);
  });
});
