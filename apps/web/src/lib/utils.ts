export function cn(...inputs: string[]) {
  return inputs.filter(Boolean).join(" ");
}

export function needsFxRates(currency: string) {
  return currency.toUpperCase() !== "EUR";
}

export function orderCardsForWalletStack<T extends { id: string }>(cards: T[], activeCardId: string | null) {
  if (!activeCardId) return cards;
  const activeCard = cards.find((card) => card.id === activeCardId);
  if (!activeCard) return cards;
  return [...cards.filter((card) => card.id !== activeCardId), activeCard];
}
