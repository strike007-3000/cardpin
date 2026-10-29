import { describe, expect, it } from "vitest";
import { baseCurrencyFor, breakEvenPurchases, monthKey, cn, getFxRate, needsFxRates, orderCardsForWalletStack } from "./utils";

describe("cn", () => {
  it("combines class names and ignores falsy values", () => {
    expect(cn("btn", false && "active", "btn-primary", undefined, null, "px-4")).toBe("btn btn-primary px-4");
  });
});


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

import { rewardLabel, rewardAmount, cleanExplanation } from "./utils";
import type { CardCalc } from "./utils";

describe("rewardLabel", () => {
  it("handles missing rules", () => {
    const calc = { rule: null } as unknown as CardCalc;
    expect(rewardLabel(calc)).toBe("No reward rule");
  });

  it("formats cashback percentages", () => {
    const calc = { rule: { rewardValue: 0.02 }, rewardType: "cashback_percentage" } as unknown as CardCalc;
    expect(rewardLabel(calc)).toBe("2.0% cashback");
  });

  it("formats fixed cashback", () => {
    const calc = { card: { currency: "EUR" }, rule: { rewardValue: 1.5 }, rewardType: "fixed_cashback" } as unknown as CardCalc;
    expect(rewardLabel(calc)).toBe("EUR 1.50 per transaction");
  });

  it("formats points", () => {
    const calc = { rule: { rewardValue: 3 }, rewardType: "points" } as unknown as CardCalc;
    expect(rewardLabel(calc)).toBe("3x points");
  });

  it("formats miles", () => {
    const calc = { rule: { rewardValue: 5 }, rewardType: "miles" } as unknown as CardCalc;
    expect(rewardLabel(calc)).toBe("5x miles");
  });
});

describe("rewardAmount", () => {
  it("returns zero for missing rules", () => {
    const calc = { card: { currency: "USD" }, rule: null } as unknown as CardCalc;
    expect(rewardAmount(calc)).toBe("USD 0.00");
  });

  it("returns net value for cashback", () => {
    const calc = { card: { currency: "EUR" }, rule: {}, rewardType: "cashback_percentage", netValue: 12.34 } as unknown as CardCalc;
    expect(rewardAmount(calc)).toBe("EUR 12.34");
  });

  it("returns points count for points reward type", () => {
    const calc = { rule: {}, rewardType: "points", grossValue: 150 } as unknown as CardCalc;
    expect(rewardAmount(calc)).toBe("150 points");
  });
});

describe("cleanExplanation", () => {
  it("leaves normal explanation untouched", () => {
    expect(cleanExplanation("Earns 2% cashback")).toBe("Earns 2% cashback");
  });

  it("formats fallback rules cleanly", () => {
    expect(cleanExplanation('Fallback rule "base-points" matched for card amex-gold')).toBe("amex-gold earns its standard rate on this purchase.");
  });
});


describe("monthKey", () => {
  it("zero-pads the local month", () => {
    expect(monthKey(new Date(2026, 0, 31))).toBe("2026-01");
    expect(monthKey(new Date(2026, 10, 1))).toBe("2026-11");
  });
});

describe("breakEvenPurchases", () => {
  it("rounds up and returns null when there is nothing to compare", () => {
    expect(breakEvenPurchases(95, 0.5)).toBe(190);
    expect(breakEvenPurchases(0, 0.5)).toBeNull();
    expect(breakEvenPurchases(95, 0)).toBeNull();
  });
});

describe("base currency", () => {
  it("uses USD for the US and EUR elsewhere", () => {
    expect(baseCurrencyFor("us")).toBe("USD");
    expect(baseCurrencyFor("BE")).toBe("EUR");
  });

  it("quotes rates against the base currency", () => {
    const rates = { eur: 1, usd: 1.25, gbp: 0.5 };
    expect(getFxRate(rates, "USD", "USD")).toBe(1);
    expect(getFxRate(rates, "EUR", "USD")).toBe(0.8);
    expect(getFxRate(rates, "GBP", "USD")).toBe(0.4);
    expect(getFxRate({ eur: 1 }, "EUR", "USD")).toBeNull();
  });
});
