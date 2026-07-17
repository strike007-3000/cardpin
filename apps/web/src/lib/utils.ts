export function cn(...inputs: string[]) {
  return inputs.filter(Boolean).join(" ");
}

export function needsFxRates(currency: string) {
  return currency.toUpperCase() !== "EUR";
}
