import { useEffect, useState } from "react";
import { getFxRate, needsFxRates } from "./utils";

export interface UseFxRatesResult {
  fxRates: Record<string, number>;
  fxStatus: "idle" | "loading" | "ready" | "error";
  isFxRateMissing: boolean;
}

const DEFAULT_FX_RATES: Record<string, number> = {
  eur: 1,
  usd: 1.08,
  gbp: 0.85,
  chf: 0.94,
};

const FX_API_URL = process.env.NEXT_PUBLIC_FX_API_URL || "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eur.json";

export function useFxRates(spendCurrency: string, baseCurrency = "EUR"): UseFxRatesResult {
  const [fxRates, setFxRates] = useState<Record<string, number>>(DEFAULT_FX_RATES);
  const [fxStatus, setFxStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  useEffect(() => {
    if (!needsFxRates(spendCurrency, baseCurrency)) {
      setFxStatus("idle");
      return;
    }

    setFxStatus("loading");

    async function fetchFXRates() {
      const cached = sessionStorage.getItem("cardpin:fx_rates");
      if (cached) {
        try {
          const rates = JSON.parse(cached);
          if (!getFxRate(rates, spendCurrency, baseCurrency)) throw new Error("Cached rate unavailable");
          setFxRates(rates);
          setFxStatus("ready");
          return;
        } catch {
          // ignore cache parse failure
        }
      }

      try {
        const res = await fetch(FX_API_URL);
        if (!res.ok) throw new Error("Failed to fetch rates");
        const data = await res.json();
        if (data && data.eur) {
          const rates = { eur: 1, ...data.eur };
          if (!getFxRate(rates, spendCurrency, baseCurrency)) throw new Error("Selected rate unavailable");
          setFxRates(rates);
          setFxStatus("ready");
          sessionStorage.setItem("cardpin:fx_rates", JSON.stringify(rates));
          return;
        }
        throw new Error("Invalid rates response");
      } catch (err) {
        console.warn("FX rates unavailable");
        setFxStatus("error");
      }
    }
    fetchFXRates();
  }, [spendCurrency, baseCurrency]);

  return { fxRates, fxStatus, isFxRateMissing: getFxRate(fxRates, spendCurrency, baseCurrency) === null };
}
