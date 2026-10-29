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

// Rewards are computed in the country's own currency; rates are quoted per 1 EUR.
export function baseCurrencyFor(country: string) {
  return country.toLowerCase() === "us" ? "USD" : "EUR";
}

export function needsFxRates(currency: string, base = "EUR") {
  return currency.toUpperCase() !== base.toUpperCase();
}

// Units of `currency` per 1 unit of `base`, or null when a rate is missing.
export function getFxRate(rates: Record<string, number>, currency: string, base = "EUR") {
  if (!needsFxRates(currency, base)) return 1;
  const rate = rates[currency.toLowerCase()];
  const baseRate = base.toUpperCase() === "EUR" ? 1 : rates[base.toLowerCase()];
  if (!(Number.isFinite(rate) && rate > 0 && Number.isFinite(baseRate) && baseRate > 0)) return null;
  return rate / baseRate;
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
    return `${result.card.currency} ${result.rule.rewardValue.toFixed(2)} per transaction`;
  }
  if (result.rewardType === "points") return `${result.rule.rewardValue}x points`;
  if (result.rewardType === "miles") return `${result.rule.rewardValue}x miles`;
  return "Reward";
}

export function rewardAmount(result: CardCalc) {
  if (!result.rule) {
    return `${result.card.currency} 0.00`;
  }
  if (result.rewardType === "points") return `${result.grossValue.toFixed(0)} points`;
  if (result.rewardType === "miles") return `${result.grossValue.toFixed(0)} miles`;
  return `${result.card.currency} ${result.netValue.toFixed(2)}`;
}

export function cleanExplanation(explanation: string) {
  if (explanation.startsWith('Fallback rule "')) {
    const match = explanation.match(/Fallback rule "([^"]+)" matched for card ([^.]+)(.*)/);
    if (match) {
      const [, , cardName, rest] = match;
      return `${cardName} earns its standard rate on this purchase${rest || "."}`;
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


// Caps are monthly, so storage keys roll over on the 1st (local time).
export function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

// How many purchases like this one it takes for the extra reward to cover the annual fee.
export function breakEvenPurchases(annualFee: number, extraPerPurchase: number) {
  if (annualFee <= 0 || extraPerPurchase <= 0) return null;
  return Math.ceil(annualFee / extraPerPurchase);
}
