export function cn(...inputs: string[]) {
  return inputs.filter(Boolean).join(" ");
}

export function needsFxRates(currency: string) {
  return currency.toUpperCase() !== "EUR";
}

export function getFxRate(rates: Record<string, number>, currency: string) {
  if (!needsFxRates(currency)) return 1;
  const rate = rates[currency.toLowerCase()];
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

export function orderCardsForWalletStack<T extends { id: string }>(cards: T[], activeCardId: string | null) {
  if (!activeCardId) return cards;
  const activeCard = cards.find((card) => card.id === activeCardId);
  if (!activeCard) return cards;
  return [...cards.filter((card) => card.id !== activeCardId), activeCard];
}

import type { Card, recommendBestCard } from "@cardpin/engine";

export type CardCalc = {
  card: Card;
  rule: ReturnType<typeof recommendBestCard>["bestRule"];
  rec: ReturnType<typeof recommendBestCard>;
  rewardType: ReturnType<typeof recommendBestCard>["rewardType"];
  grossValue: number;
  fxFee: number;
  netValue: number;
  label: string;
};

export function rewardLabel(result: CardCalc) {
  if (!result.rule) return "No reward rule";
  if (result.rewardType === "cashback_percentage") return `${(result.rule.rewardValue * 100).toFixed(1)}% cashback`;
  if (result.rewardType === "fixed_cashback") return `EUR ${result.rule.rewardValue.toFixed(2)} per transaction`;
  if (result.rewardType === "points") return `${result.rule.rewardValue}x points`;
  if (result.rewardType === "miles") return `${result.rule.rewardValue}x miles`;
  return "Reward";
}

export function rewardAmount(result: CardCalc) {
  if (!result.rule) return "EUR 0.00";
  if (result.rewardType === "points") return `${result.grossValue.toFixed(0)} points`;
  if (result.rewardType === "miles") return `${result.grossValue.toFixed(0)} miles`;
  return `EUR ${result.netValue.toFixed(2)}`;
}
export function cleanExplanation(explanation: string) {
  if (explanation.startsWith('Fallback rule "')) {
    const match = explanation.match(/Fallback rule "([^"]+)" matched for card ([^.]+)(.*)/);
    if (match) {
      const [, ruleName, cardName, rest] = match;
      const cleanRule = ruleName
        .replaceAll("-", " ")
        .replace("points", "rewards")
        .replace("base", "general spending");
      return `Earns rewards on ${cleanRule} under your ${cardName} terms.${rest}`;
    }
  }
  return explanation;
}
