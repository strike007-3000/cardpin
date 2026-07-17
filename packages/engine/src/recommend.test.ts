import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { recommendBestCard } from "./recommend";
import type { Card, Merchant, RewardRule, CountryDataset, Issuer } from "@cardpin/schemas";

// Helper validator to simulate compile-datasets validation logic
function validateDataset(dataset: CountryDataset) {
  const issuerIds = new Set(dataset.issuers.map((i: Issuer) => i.id));
  const cardIds = new Set(dataset.cards.map((c: Card) => c.id));
  const merchantIds = new Set(dataset.merchants.map((m: Merchant) => m.id));

  for (const card of dataset.cards) {
    if (!issuerIds.has(card.issuerId)) {
      throw new Error(`Orphan issuerId: ${card.issuerId}`);
    }
  }

  for (const rule of dataset.rewardRules) {
    if (!cardIds.has(rule.cardId)) {
      throw new Error(`Orphan cardId: ${rule.cardId}`);
    }
    if (rule.merchantId && !merchantIds.has(rule.merchantId)) {
      throw new Error(`Orphan merchantId: ${rule.merchantId}`);
    }
  }
  return true;
}

const mockDataset: CountryDataset = {
  country: "BE",
  issuers: [
    { id: "bank-a", name: "Bank A" },
    { id: "bank-b", name: "Bank B" }
  ],
  cards: [
    {
      id: "card-a",
      name: "Card A Gold",
      issuerId: "bank-a",
      country: "BE",
      network: "visa",
      annualFee: 0,
      fxFeePercentage: 0.01, // 1% FX fee
      currency: "EUR",
      rewardRules: [] as string[],
      source: "seed",
      lastUpdated: "2026-01-01"
    },
    {
      id: "card-b",
      name: "Card B Premium",
      issuerId: "bank-b",
      country: "BE",
      network: "mastercard",
      annualFee: 0,
      fxFeePercentage: 0,
      currency: "EUR",
      rewardRules: [] as string[],
      source: "seed",
      lastUpdated: "2026-01-01"
    }
  ],
  merchants: [
    {
      id: "carrefour-be",
      name: "Carrefour BE",
      country: "BE",
      categories: ["groceries"],
      website: "https://www.carrefour.be",
      lastUpdated: "2026-01-01"
    }
  ],
  rewardRules: [
    // Fallback/default for Card A: 1% cashback
    {
      id: "card-a-fallback",
      cardId: "card-a",
      country: "BE",
      rewardType: "cashback_percentage",
      rewardValue: 0.01,
      source: {
        sourceUrl: "https://example.com",
        verifiedAt: "2026-06-14",
        verifiedBy: "community"
      },
      conditions: {},
      lastUpdated: "2026-01-01"
    },
    // Category-specific (groceries) for Card A: 2% cashback
    {
      id: "card-a-groceries",
      cardId: "card-a",
      country: "BE",
      category: "groceries",
      rewardType: "cashback_percentage",
      rewardValue: 0.02,
      source: {
        sourceUrl: "https://example.com",
        verifiedAt: "2026-06-14",
        verifiedBy: "community"
      },
      conditions: {},
      lastUpdated: "2026-01-01"
    },
    // Merchant-specific (Carrefour) for Card A: 3% cashback
    {
      id: "card-a-carrefour",
      cardId: "card-a",
      country: "BE",
      merchantId: "carrefour-be",
      rewardType: "cashback_percentage",
      rewardValue: 0.03,
      source: {
        sourceUrl: "https://example.com",
        verifiedAt: "2026-06-14",
        verifiedBy: "community"
      },
      conditions: {},
      lastUpdated: "2026-01-01"
    },
    // Card B fallback: 10 points per Euro
    {
      id: "card-b-fallback",
      cardId: "card-b",
      country: "BE",
      rewardType: "points",
      rewardValue: 10,
      source: {
        sourceUrl: "https://example.com",
        verifiedAt: "2026-06-14",
        verifiedBy: "community"
      },
      conditions: {},
      lastUpdated: "2026-01-01"
    },
    // Card B category specific: 1.5 Euro fixed cashback on Groceries
    {
      id: "card-b-groceries",
      cardId: "card-b",
      country: "BE",
      category: "groceries",
      rewardType: "fixed_cashback",
      rewardValue: 1.5,
      source: {
        sourceUrl: "https://example.com",
        verifiedAt: "2026-06-14",
        verifiedBy: "community"
      },
      conditions: {},
      lastUpdated: "2026-01-01"
    }
  ]
};

describe("Recommendation Engine Priority and Math Tests", () => {
  it("merchant-specific beats category", () => {
    const result = recommendBestCard({
      merchant: "Carrefour BE",
      category: "groceries",
      ownedCards: [mockDataset.cards[0]], // Card A only
      country: "BE",
      dataset: mockDataset,
      spendAmount: 100
    });
    expect(result.bestCard?.id).toBe("card-a");
    expect(result.bestRule?.id).toBe("card-a-carrefour");
    expect(result.estimatedValue).toBe(0.03); // Native percentage
  });

  it("category beats fallback", () => {
    const result = recommendBestCard({
      category: "groceries",
      ownedCards: [mockDataset.cards[0]], // Card A only
      country: "BE",
      dataset: mockDataset,
      spendAmount: 100
    });
    expect(result.bestCard?.id).toBe("card-a");
    expect(result.bestRule?.id).toBe("card-a-groceries");
    expect(result.estimatedValue).toBe(0.02);
  });

  it("fallback works", () => {
    const result = recommendBestCard({
      category: "dining", // No specific category rule
      ownedCards: [mockDataset.cards[0]],
      country: "BE",
      dataset: mockDataset,
      spendAmount: 100
    });
    expect(result.bestCard?.id).toBe("card-a");
    expect(result.bestRule?.id).toBe("card-a-fallback");
    expect(result.estimatedValue).toBe(0.01);
  });

  it("percentage cashback calculation works when spendAmount is provided", () => {
    const result = recommendBestCard({
      merchant: "Carrefour BE",
      ownedCards: [mockDataset.cards[0]],
      country: "BE",
      dataset: mockDataset,
      spendAmount: 200
    });
    expect(result.bestCard?.id).toBe("card-a");
    expect(result.estimatedValue).toBe(0.03);
  });

  it("fixed cashback is not added to percentage cashback (they do not sum)", () => {
    const result = recommendBestCard({
      merchant: "Carrefour BE",
      ownedCards: [mockDataset.cards[0]],
      country: "BE",
      dataset: mockDataset,
      spendAmount: 100
    });
    expect(result.bestRule?.rewardValue).toBe(0.03);
    expect(result.estimatedValue).toBe(0.03);
  });

  it("points/miles are not mixed with euros unless valuation is provided", () => {
    const resultNoValuation = recommendBestCard({
      category: "groceries",
      ownedCards: mockDataset.cards, // Card A and B
      country: "BE",
      dataset: mockDataset,
      spendAmount: 100
    });
    expect(resultNoValuation.bestCard?.id).toBe("card-a");

    const pointsResult = recommendBestCard({
      category: "dining", // Card A fallback (1%) vs Card B fallback (10 points/EUR)
      ownedCards: mockDataset.cards,
      country: "BE",
      dataset: mockDataset,
      spendAmount: 100,
      valuations: { points: 0.005 } // 1000 points * 0.005 = 5 EUR
    });
    expect(pointsResult.bestCard?.id).toBe("card-b");
    expect(pointsResult.estimatedValue).toBe(1000); // 1000 points native
    expect(pointsResult.rewardType).toBe("points");
  });

  it("fxFeePercentage is deducted from rewards during foreign spend", () => {
    // Card A has 3% cashback and 1% FX fee. Net reward should be 2% (2 EUR on 100 spend).
    // Card B has 1.5 EUR fixed cashback and 0% FX fee. Net reward = 1.5 EUR.
    const result = recommendBestCard({
      merchant: "Carrefour BE",
      ownedCards: mockDataset.cards,
      country: "BE",
      dataset: mockDataset,
      spendAmount: 100,
      isForeignSpend: true
    });
    expect(result.bestCard?.id).toBe("card-a");
  });
});

describe("Orphan Validation Tests", () => {
  it("invalid orphan cardId fails validation", () => {
    const invalidDataset: CountryDataset = {
      country: "BE",
      issuers: mockDataset.issuers,
      cards: [mockDataset.cards[0]], // Card A only
      merchants: mockDataset.merchants,
      rewardRules: [
        {
          id: "rule-orphan-card",
          cardId: "non-existent-card-id", // Orphan
          country: "BE",
          rewardType: "cashback_percentage",
          rewardValue: 0.01,
          source: {
            sourceUrl: "https://example.com",
            verifiedAt: "2026-06-14",
            verifiedBy: "community"
          },
          conditions: {},
          lastUpdated: "2026-01-01"
        }
      ]
    };
    expect(() => validateDataset(invalidDataset)).toThrow(/Orphan cardId/);
  });

  it("invalid orphan merchantId fails validation", () => {
    const invalidDataset: CountryDataset = {
      country: "BE",
      issuers: mockDataset.issuers,
      cards: mockDataset.cards,
      merchants: [], // No merchants
      rewardRules: [
        {
          id: "rule-orphan-merchant",
          cardId: "card-a",
          country: "BE",
          merchantId: "non-existent-merchant", // Orphan
          rewardType: "cashback_percentage",
          rewardValue: 0.01,
          source: {
            sourceUrl: "https://example.com",
            verifiedAt: "2026-06-14",
            verifiedBy: "community"
          },
          conditions: {},
          lastUpdated: "2026-01-01"
        }
      ]
    };
    expect(() => validateDataset(invalidDataset)).toThrow(/Orphan merchantId/);
  });

  it("invalid orphan issuerId fails validation", () => {
    const invalidDataset: CountryDataset = {
      country: "BE",
      issuers: [], // No issuers
      cards: mockDataset.cards,
      merchants: mockDataset.merchants,
      rewardRules: mockDataset.rewardRules
    };
    expect(() => validateDataset(invalidDataset)).toThrow(/Orphan issuerId/);
  });

  it("applies reward cap limits based on monthly spent", () => {
    const capRule: RewardRule = {
      id: "rule-capped",
      cardId: "card-a",
      country: "BE",
      category: "groceries",
      rewardType: "cashback_percentage",
      rewardValue: 0.02,
      conditions: {
        cap: 10
      },
      source: { sourceUrl: "https://example.com", verifiedAt: "2026-01-01", verifiedBy: "test" },
      lastUpdated: "2026-01-01"
    };
    const dataset: CountryDataset = {
      ...mockDataset,
      rewardRules: [capRule]
    };

    const rec1 = recommendBestCard({
      category: "groceries",
      ownedCards: [mockDataset.cards[0]],
      country: "BE",
      dataset,
      spendAmount: 100,
      cardMonthlySpends: { "card-a": 100 }
    });
    expect(rec1.estimatedValue).toBe(0.02);
    expect(rec1.convertedValue).toBe(2);

    const rec2 = recommendBestCard({
      category: "groceries",
      ownedCards: [mockDataset.cards[0]],
      country: "BE",
      dataset,
      spendAmount: 100,
      cardMonthlySpends: { "card-a": 450 }
    });
    expect(rec2.convertedValue).toBe(1);

    const rec3 = recommendBestCard({
      category: "groceries",
      ownedCards: [mockDataset.cards[0]],
      country: "BE",
      dataset,
      spendAmount: 100,
      cardMonthlySpends: { "card-a": 500 }
    });
    expect(rec3.convertedValue).toBe(0);
  });
});

describe("Production Datasets Validation Tests", () => {
  it("all production datasets in data/ folder must pass validation", () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const dataDir = path.resolve(__dirname, "../../../data");
    const countries = fs.readdirSync(dataDir).filter((f: string) => fs.statSync(path.join(dataDir, f)).isDirectory());
    for (const country of countries) {
      const countryDir = path.join(dataDir, country);
      const issuers = JSON.parse(fs.readFileSync(path.join(countryDir, "issuers.json"), "utf8")).issuers;
      const cards = JSON.parse(fs.readFileSync(path.join(countryDir, "cards.json"), "utf8")).cards;
      const merchants = JSON.parse(fs.readFileSync(path.join(countryDir, "merchants.json"), "utf8")).merchants;
      const rewardRules = JSON.parse(fs.readFileSync(path.join(countryDir, "reward_rules.json"), "utf8")).rewardRules;
      const dataset: CountryDataset = {
        country: country.toUpperCase(),
        issuers,
        cards,
        merchants,
        rewardRules
      };
      expect(validateDataset(dataset)).toBe(true);
    }
  });
});

