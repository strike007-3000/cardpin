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
