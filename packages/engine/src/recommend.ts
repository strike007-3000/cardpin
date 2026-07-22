import type { Card, Merchant, RewardRule, CountryDataset } from "@cardpin/schemas";

export type RecommendationInput = {
  merchant?: string;
  category?: string;
  ownedCards: Card[];
  country: string;
  dataset: CountryDataset;
  spendAmount?: number; // Defaults to 100 for percentage comparison
  isForeignSpend?: boolean; // Deducts fxFeePercentage * spend if true
  cardMonthlySpends?: Record<string, number>; // Monthly spend in base currency for each card
  valuations?: {
    points?: number; // value of 1 point in currency (e.g. 0.01)
    miles?: number;  // value of 1 mile in currency (e.g. 0.01)
  };
  audience?: "consumer" | "business"; // Filter cards by target audience
  includeUnownedCards?: boolean; // If true, evaluates un-owned cards in the dataset to find top unlocking recommendation
};

export type CardResult = {
  card: Card;
  rule: RewardRule | null;
  estimatedValue: number; // Native unit (percentage, currency, points, or miles)
  convertedValue: number; // Converted to base currency for comparison
  rewardType: "cashback_percentage" | "fixed_cashback" | "points" | "miles" | null;
};

export type RecommendationOutput = {
  bestCard: Card | null;
  bestRule: RewardRule | null;
  estimatedValue: number;
  convertedValue: number;
  rewardType: "cashback_percentage" | "fixed_cashback" | "points" | "miles" | null;
  explanation: string;
  alternatives: Array<{
    card: Card;
    rule: RewardRule | null;
    estimatedValue: number;
    convertedValue: number;
    rewardType: "cashback_percentage" | "fixed_cashback" | "points" | "miles" | null;
  }>;
  unownedUnlockCard?: {
    card: Card;
    rule: RewardRule | null;
    estimatedValue: number;
    convertedValue: number;
    rewardType: "cashback_percentage" | "fixed_cashback" | "points" | "miles" | null;
    explanation: string;
  } | null;
};

function safeLower(s: string | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

function evaluateCardForSpend(
  card: Card,
  spend: number,
  country: string,
  dataset: CountryDataset,
  matchedMerchant: Merchant | undefined,
  categoryQuery: string,
  merchantCategories: Set<string>,
  isForeignSpend?: boolean,
  cardMonthlySpends?: Record<string, number>,
  valuations?: { points?: number; miles?: number }
): CardResult {
  const cardRules = dataset.rewardRules.filter(
    (r: RewardRule) => r.cardId === card.id && r.country.toUpperCase() === country.toUpperCase()
  );

  let activeRule: RewardRule | null = null;

  // A. Merchant-specific rule
  if (matchedMerchant) {
    const merchantRule = cardRules.find(
      (r: RewardRule) => r.merchantId && safeLower(r.merchantId) === safeLower(matchedMerchant?.id)
    );
    if (merchantRule) {
      activeRule = merchantRule;
    }
  }

  // B. Category-specific rule
  if (!activeRule) {
    const categoryRule = cardRules.find((r: RewardRule) => {
      if (!r.category) return false;
      const ruleCategory = safeLower(r.category);
      return (
        ruleCategory === categoryQuery ||
        merchantCategories.has(ruleCategory)
      );
    });
    if (categoryRule) {
      activeRule = categoryRule;
    }
  }

  // C. Fallback rule
  if (!activeRule) {
    const fallbackRule = cardRules.find((r: RewardRule) => !r.category && !r.merchantId);
    if (fallbackRule) {
      activeRule = fallbackRule;
    }
  }

  if (activeRule) {
    let estimatedValue = activeRule.rewardValue;
    let convertedValue = 0;

    const capValue = activeRule.cap ?? activeRule.conditions?.cap;
    const minSpend = activeRule.conditions?.minSpend ?? 0;
    const monthlySpend = cardMonthlySpends?.[card.id] ?? 0;

    if (minSpend > 0 && spend < minSpend) {
      estimatedValue = 0;
      convertedValue = 0;
    } else if (capValue !== undefined) {
      const earnedSoFar = monthlySpend * activeRule.rewardValue;
      const remainingReward = Math.max(0, capValue - earnedSoFar);

      if (remainingReward === 0) {
        estimatedValue = 0;
        convertedValue = 0;
      } else {
        switch (activeRule.rewardType) {
          case "cashback_percentage": {
            let reward = spend * activeRule.rewardValue;
            if (reward > remainingReward) reward = remainingReward;
            estimatedValue = activeRule.rewardValue;
            convertedValue = reward;
            break;
          }
          case "fixed_cashback": {
            let reward = activeRule.rewardValue;
            if (reward > remainingReward) reward = remainingReward;
            estimatedValue = reward;
            convertedValue = reward;
            break;
          }
          case "points": {
            let reward = spend * activeRule.rewardValue;
            if (reward > remainingReward) reward = remainingReward;
            estimatedValue = reward;
            if (valuations?.points !== undefined) {
              convertedValue = reward * valuations.points;
            } else {
              convertedValue = 0;
            }
            break;
          }
          case "miles": {
            let reward = spend * activeRule.rewardValue;
            if (reward > remainingReward) reward = remainingReward;
            estimatedValue = reward;
            if (valuations?.miles !== undefined) {
              convertedValue = reward * valuations.miles;
            } else {
              convertedValue = 0;
            }
            break;
          }
        }
      }
    } else {
      switch (activeRule.rewardType) {
        case "cashback_percentage":
          estimatedValue = activeRule.rewardValue;
          convertedValue = spend * activeRule.rewardValue;
          break;
        case "fixed_cashback":
          estimatedValue = activeRule.rewardValue;
          convertedValue = activeRule.rewardValue;
          break;
        case "points":
          estimatedValue = spend * activeRule.rewardValue;
          if (valuations?.points !== undefined) {
            convertedValue = estimatedValue * valuations.points;
          } else {
            convertedValue = 0;
          }
          break;
        case "miles":
          estimatedValue = spend * activeRule.rewardValue;
          if (valuations?.miles !== undefined) {
            convertedValue = estimatedValue * valuations.miles;
          } else {
            convertedValue = 0;
          }
          break;
      }
    }

    // Deduct foreign transaction fee if applicable
    if (isForeignSpend) {
      const fxFee = spend * (card.fxFeePercentage ?? 0);
      convertedValue = Math.max(0, convertedValue - fxFee);
    }

    return {
      card,
      rule: activeRule,
      estimatedValue,
      convertedValue,
      rewardType: activeRule.rewardType
    };
  } else {
    let convertedValue = 0;
    if (isForeignSpend) {
      const fxFee = spend * (card.fxFeePercentage ?? 0);
      convertedValue = -fxFee;
    }

    return {
      card,
      rule: null,
      estimatedValue: 0,
      convertedValue,
      rewardType: null
    };
  }
}

export function recommendBestCard(input: RecommendationInput): RecommendationOutput {
  const { merchant, category, ownedCards, country, dataset, spendAmount, isForeignSpend, cardMonthlySpends, valuations, audience, includeUnownedCards } = input;
  const spend = spendAmount ?? 100;

  const merchantQuery = safeLower(merchant);
  const categoryQuery = safeLower(category);

  // 1. Identify matched merchant (exact case-insensitive match or substring match)
  let matchedMerchant: Merchant | undefined;
  if (merchantQuery) {
    matchedMerchant = dataset.merchants.find(
      (m: Merchant) => safeLower(m.id) === merchantQuery || safeLower(m.name) === merchantQuery
    );
    // Fallback search
    if (!matchedMerchant) {
      matchedMerchant = dataset.merchants.find(
        (m: Merchant) => safeLower(m.name).includes(merchantQuery) || merchantQuery.includes(safeLower(m.name))
      );
    }
  }

  const merchantCategories = new Set(
    (matchedMerchant?.categories ?? []).map((c: string) => safeLower(c))
  );

  const ownedCardIds = new Set(ownedCards.map(c => c.id));

  // Evaluate owned cards
  const cardResults: CardResult[] = ownedCards.map(card =>
    evaluateCardForSpend(
      card,
      spend,
      country,
      dataset,
      matchedMerchant,
      categoryQuery,
      merchantCategories,
      isForeignSpend,
      cardMonthlySpends,
      valuations
    )
  );

  cardResults.sort((a, b) => {
    if (b.convertedValue !== a.convertedValue) {
      return b.convertedValue - a.convertedValue;
    }
    return b.estimatedValue - a.estimatedValue;
  });

  const bestResult = cardResults[0] ?? null;

  let explanation = "";
  if (bestResult) {
    if (bestResult.rule) {
      if (bestResult.rule.merchantId) {
        explanation = `Merchant-specific rule "${bestResult.rule.id}" matched for card ${bestResult.card.name}.`;
      } else if (bestResult.rule.category) {
        explanation = `Category-specific rule "${bestResult.rule.id}" matched for category "${bestResult.rule.category}" on card ${bestResult.card.name}.`;
      } else {
        explanation = `Fallback rule "${bestResult.rule.id}" matched for card ${bestResult.card.name}.`;
      }

      if (isForeignSpend && (bestResult.card.fxFeePercentage ?? 0) > 0) {
        explanation += ` Deducted ${(bestResult.card.fxFeePercentage * 100).toFixed(2)}% foreign transaction fee.`;
      }
    } else {
      explanation = "No matching reward rule found.";
      if (isForeignSpend && (bestResult.card.fxFeePercentage ?? 0) > 0) {
        explanation = `No active rules found. Deducted ${(bestResult.card.fxFeePercentage * 100).toFixed(2)}% foreign transaction fee.`;
      }
    }
  } else {
    explanation = "No owned cards provided.";
  }

  const alternatives = cardResults.slice(1).map((r) => ({
    card: r.card,
    rule: r.rule,
    estimatedValue: r.estimatedValue,
    convertedValue: r.convertedValue,
    rewardType: r.rewardType
  }));

  // Evaluate un-owned cards for portfolio optimization unlock recommendation
  let unownedUnlockCard: RecommendationOutput["unownedUnlockCard"] = null;

  if (includeUnownedCards) {
    const unownedCards = dataset.cards.filter(
      card =>
        !ownedCardIds.has(card.id) &&
        card.country.toUpperCase() === country.toUpperCase() &&
        (card.audience ?? "consumer") === (audience ?? "consumer")
    );

    const unownedResults: CardResult[] = unownedCards.map(card =>
      evaluateCardForSpend(
        card,
        spend,
        country,
        dataset,
        matchedMerchant,
        categoryQuery,
        merchantCategories,
        isForeignSpend,
        cardMonthlySpends,
        valuations
      )
    );

    unownedResults.sort((a, b) => {
      if (b.convertedValue !== a.convertedValue) {
        return b.convertedValue - a.convertedValue;
      }
      return b.estimatedValue - a.estimatedValue;
    });

    const topUnowned = unownedResults[0];
    if (topUnowned && topUnowned.rule) {
      const currentBestVal = bestResult ? bestResult.convertedValue : 0;
      if (topUnowned.convertedValue > currentBestVal || !bestResult) {
        let unlockExp = `Unlock ${topUnowned.card.name} to earn higher rewards on this transaction.`;
        if (topUnowned.rule.category) {
          unlockExp += ` (${topUnowned.rule.category} category rule)`;
        } else if (topUnowned.rule.merchantId) {
          unlockExp += ` (Merchant rule for ${topUnowned.rule.merchantId})`;
        }
        unownedUnlockCard = {
          card: topUnowned.card,
          rule: topUnowned.rule,
          estimatedValue: topUnowned.estimatedValue,
          convertedValue: topUnowned.convertedValue,
          rewardType: topUnowned.rewardType,
          explanation: unlockExp
        };
      }
    }
  }

  return {
    bestCard: bestResult ? bestResult.card : null,
    bestRule: bestResult ? bestResult.rule : null,
    estimatedValue: bestResult ? bestResult.estimatedValue : 0,
    convertedValue: bestResult ? bestResult.convertedValue : 0,
    rewardType: bestResult ? bestResult.rewardType : null,
    explanation,
    alternatives,
    unownedUnlockCard
  };
}
