import type { Card, RewardRule, RecommendationOutput } from "@cardpin/engine";

export type CardCalc = {
  card: Card;
  rule: RewardRule | null;
  rec: RecommendationOutput;
  rewardType: RecommendationOutput["rewardType"];
  grossValue: number;
  fxFee: number;
  netValue: number;
  label: string;
};

import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
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

export function rewardLabel(result: CardCalc) {
  if (!result.rule) return "No reward rule";
  if (result.rewardType === "cashback_percentage") return `${(result.rule.rewardValue * 100).toFixed(1)}% cashback`;
  if (result.rewardType === "fixed_cashback") {
    return `EUR ${result.rule.rewardValue.toFixed(2)} per transaction`;
  }
  if (result.rewardType === "points") return `${result.rule.rewardValue}x points`;
  if (result.rewardType === "miles") return `${result.rule.rewardValue}x miles`;
  return "Reward";
}

export function rewardAmount(result: CardCalc) {
  if (!result.rule) {
    return "EUR 0.00";
  }
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

export function formatRelativeDate(dateStr?: string) {
  if (!dateStr) return "recently";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const now = new Date();
  const diffMonths = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
  if (diffMonths <= 0) return "this month";
  if (diffMonths === 1) return "1 month ago";
  return `${diffMonths} months ago`;
}

