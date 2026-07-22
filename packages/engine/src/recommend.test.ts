import { describe, it, expect } from "vitest";
import { recommendBestCard } from "./recommend";
import type { Card, CountryDataset, RewardRule } from "@cardpin/schemas";

const mockCardA: Card = {
  id: "card-a",
  name: "Basic Cashback Card",
  issuerId: "issuer-1",
  country: "BE",
  network: "visa",
  annualFee: 0,
  fxFeePercentage: 0,
  currency: "EUR",
  rewardRules: ["rule-a-fallback"],
  source: "community",
  lastUpdated: "2026-01-01"
};

const mockCardB: Card = {
  id: "card-b",
  name: "Super Groceries Card",
  issuerId: "issuer-1",
  country: "BE",
  network: "mastercard",
  annualFee: 20,
  fxFeePercentage: 0,
  currency: "EUR",
  rewardRules: ["rule-b-groceries"],
  source: "community",
  lastUpdated: "2026-01-01"
};

const mockRuleA: RewardRule = {
  id: "rule-a-fallback",
  cardId: "card-a",
  country: "BE",
  rewardType: "cashback_percentage",
  rewardValue: 0.01, // 1% fallback
  conditions: {},
  source: {
    sourceUrl: "https://example.com",
    verifiedAt: "2026-01-01",
    verifiedBy: "test"
  },
  lastUpdated: "2026-01-01"
};

const mockRuleB: RewardRule = {
  id: "rule-b-groceries",
  cardId: "card-b",
  country: "BE",
  category: "groceries",
  rewardType: "cashback_percentage",
  rewardValue: 0.05, // 5% groceries
  conditions: {
    minSpend: 30
  },
  source: {
    sourceUrl: "https://example.com",
    verifiedAt: "2026-01-01",
    verifiedBy: "test"
  },
  lastUpdated: "2026-01-01"
};

const mockDataset: CountryDataset = {
  country: "BE",
  issuers: [{ id: "issuer-1", name: "Bank 1" }],
  cards: [mockCardA, mockCardB],
  merchants: [],
  rewardRules: [mockRuleA, mockRuleB]
};

describe("recommendBestCard", () => {
  it("returns no best card when ownedCards is empty and includeUnownedCards is false", () => {
    const res = recommendBestCard({
      ownedCards: [],
      country: "BE",
      dataset: mockDataset
    });
    expect(res.bestCard).toBeNull();
    expect(res.convertedValue).toBe(0);
    expect(res.unownedUnlockCard).toBeFalsy();
  });

  it("enforces minSpend threshold on reward rules", () => {
    // Transaction spend = 20, which is below mockCardB's minSpend of 30
    const res = recommendBestCard({
      category: "groceries",
      ownedCards: [mockCardB],
      country: "BE",
      dataset: mockDataset,
      spendAmount: 20
    });
    expect(res.bestCard?.id).toBe("card-b");
    expect(res.convertedValue).toBe(0); // Earns 0 because spend < minSpend
  });

  it("awards full percentage reward when spend meets or exceeds minSpend", () => {
    // Transaction spend = 50, exceeding minSpend of 30
    const res = recommendBestCard({
      category: "groceries",
      ownedCards: [mockCardB],
      country: "BE",
      dataset: mockDataset,
      spendAmount: 50
    });
    expect(res.bestCard?.id).toBe("card-b");
    expect(res.convertedValue).toBe(2.5); // 5% of 50 = 2.5 EUR
  });

  it("recommends an unowned card as Next Card to Unlock when it yields higher value", () => {
    // User only owns Card A (1%), but Card B (5%) is in the dataset for groceries spend = 100
    const res = recommendBestCard({
      category: "groceries",
      ownedCards: [mockCardA],
      country: "BE",
      dataset: mockDataset,
      spendAmount: 100,
      includeUnownedCards: true
    });

    expect(res.bestCard?.id).toBe("card-a");
    expect(res.convertedValue).toBe(1.0); // 1% of 100
    expect(res.unownedUnlockCard).toBeTruthy();
    expect(res.unownedUnlockCard?.card.id).toBe("card-b");
    expect(res.unownedUnlockCard?.convertedValue).toBe(5.0); // 5% of 100
  });
});
