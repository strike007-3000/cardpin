"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { recommendBestCard } from "@cardpin/engine";
import type { Card, CountryDataset, Merchant } from "@cardpin/engine";
import { getFxRate, needsFxRates, orderCardsForWalletStack } from "../lib/utils";

type CardCalc = {
  card: Card;
  rule: ReturnType<typeof recommendBestCard>["bestRule"];
  rec: ReturnType<typeof recommendBestCard>;
  rewardType: ReturnType<typeof recommendBestCard>["rewardType"];
  grossValue: number;
  fxFee: number;
  netValue: number;
  label: string;
};

function formatCategory(category: string) {
  return category.replaceAll("-", " ");
}

function normalizeSpend(raw: string) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return 50;
  return parsed;
}

function rewardLabel(result: CardCalc) {
  if (!result.rule) return "No reward rule";
  if (result.rewardType === "cashback_percentage") return `${(result.rule.rewardValue * 100).toFixed(1)}% cashback`;
  if (result.rewardType === "fixed_cashback") return `EUR ${result.rule.rewardValue.toFixed(2)} per transaction`;
  if (result.rewardType === "points") return `${result.rule.rewardValue}x points`;
  if (result.rewardType === "miles") return `${result.rule.rewardValue}x miles`;
  return "Reward";
}

function rewardAmount(result: CardCalc) {
  if (!result.rule) return "EUR 0.00";
  if (result.rewardType === "points") return `${result.grossValue.toFixed(0)} points`;
  if (result.rewardType === "miles") return `${result.grossValue.toFixed(0)} miles`;
  return `EUR ${result.netValue.toFixed(2)}`;
}

function cleanExplanation(explanation: string) {
  if (explanation.startsWith('Fallback rule "')) {
    const match = explanation.match(/Fallback rule "([^"]+)" matched for card (.+)/);
    if (match) {
      const [, ruleName, cardName] = match;
      const cleanRule = ruleName
        .replaceAll("-", " ")
        .replace("points", "rewards")
        .replace("base", "general spending");
      return `Earns rewards on ${cleanRule} under your ${cardName} terms.`;
    }
  }
  return explanation;
}

function GlobeIcon() {
  return (
    <svg className="step-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg className="step-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" ry="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="step-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function CreditCardPlaceholder() {
  return (
    <div className="placeholder-card-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "100%", height: "100%" }}>
        <rect x="2" y="5" width="20" height="14" rx="2" ry="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
        <line x1="6" y1="15" x2="12" y2="15" />
      </svg>
    </div>
  );
}

function CardNetworkLogo({ network }: { network: string }) {
  const net = network.toLowerCase();
  if (net === "mastercard") {
    return (
      <span className="network-logo network-logo--mastercard" aria-label="Mastercard">
        <span className="circle circle--red" />
        <span className="circle circle--orange" />
      </span>
    );
  }
  if (net === "visa") {
    return (
      <span className="network-logo network-logo--visa" aria-label="Visa">
        VISA
      </span>
    );
  }
  if (net === "amex" || net === "american-express") {
    return (
      <span className="network-logo network-logo--amex" aria-label="American Express">
        AMEX
      </span>
    );
  }
  return <span className="network-logo network-logo--generic">{network.toUpperCase()}</span>;
}

function getCardThemeClass(issuerId: string, network: string) {
  const normalized = issuerId.toLowerCase();
  if (normalized.includes("american-express")) {
    if (normalized.includes("gold")) return "card-theme-amex-gold";
    if (normalized.includes("platinum")) return "card-theme-amex-platinum";
    return "card-theme-amex-green";
  }
  if (normalized.includes("n26")) {
    if (normalized.includes("metal")) return "card-theme-n26-metal";
    return "card-theme-n26-standard";
  }
  if (normalized.includes("dkb")) return "card-theme-dkb";
  if (normalized.includes("deutsche-bank") || normalized.includes("miles-and-more")) return "card-theme-deutsche-bank";
  if (normalized.includes("commerzbank")) return "card-theme-commerzbank";
  if (normalized.includes("barclays")) return "card-theme-barclays";
  if (normalized.includes("hanseatic")) return "card-theme-hanseatic";
  if (normalized.includes("advanzia")) return "card-theme-advanzia";
  if (normalized.includes("revolut")) {
    if (normalized.includes("metal")) return "card-theme-revolut-metal";
  }
  
  if (network === "visa") return "card-theme-fallback-visa";
  if (network === "mastercard") return "card-theme-fallback-mastercard";
  return "card-theme-fallback-amex";
}

export default function CardPinCalculator() {
  const [country, setCountry] = useState<string>("be");
  const [dataset, setDataset] = useState<CountryDataset | null>(null);
  const [ownedCardIds, setOwnedCardIds] = useState<string[]>([]);
  const [merchantQuery, setMerchantQuery] = useState<string>("");
  const [categoryQuery, setCategoryQuery] = useState<string>("");
  const [spendInput, setSpendInput] = useState<string>("50");
  const [isForeignSpend, setIsForeignSpend] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [audience, setAudience] = useState<"consumer" | "business">("consumer");

  const [showWelcome, setShowWelcome] = useState<boolean | null>(null);
  const [showFullInstructions, setShowFullInstructions] = useState<boolean>(false);

  // FX & Spend Caps States
  const [spendCurrency, setSpendCurrency] = useState<string>("EUR");
  const [fxRates, setFxRates] = useState<Record<string, number>>({ eur: 1, usd: 1.08, gbp: 0.85, chf: 0.94 });
  const [fxStatus, setFxStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [cardMonthlySpends, setCardMonthlySpends] = useState<Record<string, number>>({});
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  // Catalog & Portability States
  const [catalogSearch, setCatalogSearch] = useState<string>("");
  const catalogDialogRef = useRef<HTMLDialogElement>(null);
  const catalogSearchRef = useRef<HTMLInputElement>(null);

  // Developer Mode States
  const [isDevMode, setIsDevMode] = useState<boolean>(false);
  const [showDevPanel, setShowDevPanel] = useState<boolean>(false);
  const [devCountry, setDevCountry] = useState<string>("be");
  const [devDataType, setDevDataType] = useState<string>("cards");
  const [devJson, setDevJson] = useState<string>("");
  const [devStatus, setDevStatus] = useState<{ type: "success" | "error" | "loading"; message: string } | null>(null);

  const spendAmount = normalizeSpend(spendInput);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("dev") === "true") {
        setIsDevMode(true);
      }
    }
  }, []);

  useEffect(() => {
    const dismissed = localStorage.getItem("cardpin:welcome_dismissed");
    setShowWelcome(!dismissed);
  }, []);

  // Load monthly spends from localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && dataset) {
      const spends: Record<string, number> = {};
      dataset.cards.forEach((card) => {
        const saved = localStorage.getItem(`cardpin:monthly_spend:${card.id}`);
        if (saved) {
          spends[card.id] = Number(saved) || 0;
        }
      });
      setCardMonthlySpends(spends);
    }
  }, [dataset]);

  // Fetch live FX rates only when a non-EUR transaction needs them.
  useEffect(() => {
    if (!needsFxRates(spendCurrency)) {
      setFxStatus("idle");
      return;
    }

    setFxStatus("loading");

    async function fetchFXRates() {
      const cached = sessionStorage.getItem("cardpin:fx_rates");
      if (cached) {
        try {
          const rates = JSON.parse(cached);
          if (!getFxRate(rates, spendCurrency)) throw new Error("Cached rate unavailable");
          setFxRates(rates);
          setFxStatus("ready");
          return;
        } catch (e) {
          // ignore cache parse failure
        }
      }

      try {
        const res = await fetch("https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eur.json");
        if (!res.ok) throw new Error("Failed to fetch rates");
        const data = await res.json();
        if (data && data.eur) {
          const rates = { eur: 1, ...data.eur };
          if (!getFxRate(rates, spendCurrency)) throw new Error("Selected rate unavailable");
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
  }, [spendCurrency]);

  function handleOpenCatalog() {
    catalogDialogRef.current?.showModal();
    catalogSearchRef.current?.focus();
  }

  function handleCloseCatalog() {
    catalogDialogRef.current?.close();
  }

  function handleUpdateMonthlySpend(cardId: string, value: number) {
    const updated = { ...cardMonthlySpends, [cardId]: value };
    setCardMonthlySpends(updated);
    localStorage.setItem(`cardpin:monthly_spend:${cardId}`, String(value));
  }

  useEffect(() => {
    async function fetchDataset() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/data/${country.toLowerCase()}.json`);
        if (!res.ok) throw new Error(`Country data not available: ${res.statusText}`);
        const data = (await res.json()) as CountryDataset;
        setDataset(data);

        const saved = localStorage.getItem(`cardpin:owned_cards:${country}`);
        if (saved) {
          const parsed = JSON.parse(saved) as string[];
          setOwnedCardIds(parsed.filter((id) => data.cards.some((card) => card.id === id)));
        } else {
          setOwnedCardIds([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load country dataset.");
      } finally {
        setLoading(false);
      }
    }

    fetchDataset();
  }, [country]);

  const availableCards = useMemo(
    () => dataset?.cards.filter((card) => (card.audience ?? "consumer") === audience) ?? [],
    [audience, dataset]
  );

  const ownedCards = useMemo(
    () => availableCards.filter((card) => ownedCardIds.includes(card.id)),
    [availableCards, ownedCardIds]
  );

  useEffect(() => {
    if (ownedCards.length > 0 && (!activeCardId || !ownedCardIds.includes(activeCardId))) {
      setActiveCardId(ownedCards[0].id);
    } else if (ownedCards.length === 0) {
      setActiveCardId(null);
    }
  }, [ownedCards, activeCardId, ownedCardIds]);

  const categoriesList = useMemo(
    () => Array.from(new Set(dataset?.merchants.flatMap((merchant: Merchant) => merchant.categories) ?? [])).sort(),
    [dataset]
  );

  const catalogCards = useMemo(() => {
    return availableCards.filter((card) => {
      if (!catalogSearch.trim()) return true;
      const q = catalogSearch.toLowerCase();
      const issuer = dataset?.issuers.find((i) => i.id === card.issuerId);
      return card.name.toLowerCase().includes(q) || (issuer?.name.toLowerCase().includes(q) ?? false);
    });
  }, [availableCards, catalogSearch, dataset]);

  function handleToggleCard(cardId: string) {
    const updated = ownedCardIds.includes(cardId)
      ? ownedCardIds.filter((id) => id !== cardId)
      : [...ownedCardIds, cardId];
    setOwnedCardIds(updated);
    localStorage.setItem(`cardpin:owned_cards:${country}`, JSON.stringify(updated));
  }

  function handleDismissWelcome() {
    setShowWelcome(false);
    localStorage.setItem("cardpin:welcome_dismissed", "true");
  }

  function handleExportWallet() {
    const dataStr = JSON.stringify({ cardIds: ownedCardIds });
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const exportFileDefaultName = `cardpin_wallet_${country}_${audience}.json`;
    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  }

  function handleImportWallet(e: React.ChangeEvent<HTMLInputElement>) {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed && Array.isArray(parsed.cardIds)) {
            const validIds = parsed.cardIds.filter((id: string) => dataset?.cards.some((card) => card.id === id));
            setOwnedCardIds(validIds);
            localStorage.setItem(`cardpin:owned_cards:${country}`, JSON.stringify(validIds));
          } else {
            alert("Invalid backup file structure.");
          }
        } catch (err) {
          alert("Failed to parse the backup file.");
        }
      };
    }
  }

  function handleSpendBlur() {
    const parsed = Number(spendInput);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setSpendInput("50");
    } else {
      setSpendInput(String(parsed));
    }
  }

  async function handleMergeSubmit() {
    setDevStatus({ type: "loading", message: "Saving data and compiling..." });
    try {
      let parsed;
      try {
        parsed = JSON.parse(devJson);
      } catch (e) {
        throw new Error("Invalid JSON: Please check the syntax.");
      }

      const res = await fetch("http://localhost:3001/api/update-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country: devCountry,
          dataType: devDataType,
          data: parsed
        })
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to update data");
      }

      setDevStatus({ type: "success", message: "Saved, validated, and compiled successfully! Reloading..." });
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setDevStatus({ type: "error", message: err.message });
    }
  }

  const cardResults: CardCalc[] = useMemo(() => {
    if (!dataset || !ownedCards.length) return [];

    const rate = getFxRate(fxRates, spendCurrency);
    if (rate === null) return [];
    const convertedSpend = spendCurrency !== "EUR" ? spendAmount / rate : spendAmount;
    const isForeign = spendCurrency !== "EUR" || isForeignSpend;

    return ownedCards
      .map((card) => {
        const rec = recommendBestCard({
          merchant: merchantQuery,
          category: categoryQuery,
          ownedCards: [card],
          country: country.toUpperCase(),
          dataset,
          spendAmount: convertedSpend,
          isForeignSpend: isForeign,
          cardMonthlySpends,
          valuations: { points: 1, miles: 1 }
        });
        const rule = rec.bestRule;
        const fxFee = isForeign ? convertedSpend * (card.fxFeePercentage ?? 0) : 0;
        let grossValue = 0;

        const capValue = rule?.cap ?? rule?.conditions?.cap;
        const monthlySpend = cardMonthlySpends[card.id] ?? 0;

        if (rule) {
          if (capValue !== undefined) {
            const earnedSoFar = monthlySpend * rule.rewardValue;
            const remainingReward = Math.max(0, capValue - earnedSoFar);
            if (remainingReward === 0) {
              grossValue = 0;
            } else {
              if (rule.rewardType === "cashback_percentage") {
                grossValue = Math.min(remainingReward, convertedSpend * rule.rewardValue);
              } else if (rule.rewardType === "fixed_cashback") {
                grossValue = Math.min(remainingReward, rule.rewardValue);
              } else {
                grossValue = Math.min(remainingReward, convertedSpend * rule.rewardValue);
              }
            }
          } else {
            if (rule.rewardType === "cashback_percentage") grossValue = convertedSpend * rule.rewardValue;
            if (rule.rewardType === "fixed_cashback") grossValue = rule.rewardValue;
            if (rule.rewardType === "points" || rule.rewardType === "miles") grossValue = convertedSpend * rule.rewardValue;
          }
        }

        const netValue = rule?.rewardType === "cashback_percentage" || rule?.rewardType === "fixed_cashback"
          ? Math.max(0, grossValue - fxFee)
          : grossValue;

        const displayGross = grossValue;
        const displayNet = netValue;
        const displayFxFee = fxFee;

        return {
          card,
          rule,
          rec,
          rewardType: rec.rewardType,
          grossValue: displayGross,
          fxFee: displayFxFee,
          netValue: displayNet,
          label: rewardLabel({
            card,
            rule,
            rec,
            rewardType: rec.rewardType,
            grossValue: displayGross,
            fxFee: displayFxFee,
            netValue: displayNet,
            label: ""
          })
        };
      })
      .sort((a, b) => b.netValue - a.netValue);
  }, [categoryQuery, country, dataset, isForeignSpend, merchantQuery, ownedCards, spendAmount, cardMonthlySpends, fxRates, spendCurrency]);

  const hasSearch = merchantQuery.trim() !== "" || categoryQuery !== "";
  const isFxRateMissing = getFxRate(fxRates, spendCurrency) === null;
  const bestResult = cardResults.find((result) => result.rule) ?? null;
  const alternatives = cardResults.filter((result) => result.card.id !== bestResult?.card.id).slice(0, 4);
  const activeCard = ownedCards.find((c) => c.id === activeCardId) || null;
  const stackedCards = orderCardsForWalletStack(ownedCards, activeCardId);

  return (
    <>
      {error && (
        <div className="card error-card">
          <h2>Error</h2>
          <p>{error}</p>
        </div>
      )}

      {loading || showWelcome === null ? (
        <div className="loading-container">Loading card datasets...</div>
      ) : (
        <>
          {showWelcome === true && (
            <section className="welcome-banner">
              <div className="welcome-banner-summary">
                <div className="welcome-banner-left">
                  <span className="welcome-icon">💡</span>
                  <span>
                    Select cards in your wallet &rarr; search merchant &rarr; find best rewards.
                  </span>
                  <button
                    type="button"
                    className="learn-more-btn"
                    onClick={() => setShowFullInstructions(!showFullInstructions)}
                  >
                    {showFullInstructions ? "Hide details" : "How it works"}
                  </button>
                </div>
                <button
                  type="button"
                  className="dismiss-btn"
                  onClick={handleDismissWelcome}
                  aria-label="Dismiss guide"
                >
                  &times;
                </button>
              </div>

              {showFullInstructions && (
                <div className="welcome-banner-details">
                  <div className="welcome-details-grid">
                    <div>
                      <h3>1. Select Owned Cards</h3>
                      <p>
                        Choose country and audience, then select cards in <strong>Step 2</strong>. Your cards are stored in your browser&apos;s local storage.
                      </p>
                    </div>
                    <div>
                      <h3>2. Search & Compare</h3>
                      <p>
                        Enter a merchant name or choose a category in <strong>Step 3</strong>. Enter your spend amount to calculate reward net value.
                      </p>
                    </div>
                    <div>
                      <h3>3. Separated Rewards</h3>
                      <p>
                        Cashback, points, and miles are separated, not aggregated, since their ultimate value depends on redemption methods.
                      </p>
                    </div>
                    <div>
                      <h3>Community Sourced</h3>
                      <p>
                        Data is community-driven. Unsupported cards/rewards are intentionally omitted instead of guessed. Verify terms with your issuer.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          <main className="flow-layout-stacked">
            <section className="card step-card step-card--horizontal">
              <div className="step-header">
                <div className="step-icon-wrapper">
                  <GlobeIcon />
                </div>
                <div className="step-title-block">
                  <div className="step-kicker">Step 1</div>
                  <h2>Choose Country & Audience</h2>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="country-select">Country</label>
                  <select id="country-select" value={country} onChange={(event) => setCountry(event.target.value)}>
                                  <option value="be">Belgium</option>
                                  <option value="de">Germany</option>
                                  <option value="nl">Netherlands</option>
                                </select>
                </div>

                <div className="form-group">
                  <label>Audience</label>
                  <div className="segmented-control" role="group" aria-label="Audience">
                    <button type="button" aria-pressed={audience === "consumer"} className={audience === "consumer" ? "active" : ""} onClick={() => setAudience("consumer")}>
                      Personal
                    </button>
                    <button type="button" aria-pressed={audience === "business"} className={audience === "business" ? "active" : ""} onClick={() => setAudience("business")}>
                      Business
                    </button>
                  </div>
                  <p className="helper-text">Personal is for everyday cards. Business is for company cards.</p>
                </div>
              </div>
            </section>

            <div className="columns-grid">
              <div className="left-column">
                <section className="card step-card">
                  <div className="step-header">
                    <div className="step-icon-wrapper">
                      <WalletIcon />
                    </div>
                    <div className="step-title-block" style={{ width: "100%" }}>
                      <div className="step-kicker">Step 2</div>
                      <div className="section-title-row" style={{ gap: "12px", justifyContent: "space-between", width: "100%" }}>
                        <h2>Your Wallet</h2>
                        <span className="quiet-pill">{ownedCards.length} in wallet</span>
                      </div>
                    </div>
                  </div>

                {ownedCards.length === 0 ? (
                  <div className="empty-state empty-state--spaced">
                    Your wallet is empty. Add some cards to get started!
                  </div>
                ) : (
                  <>
                    <div className="wallet-stack">
                      {stackedCards.map((card) => {
                        const issuerName = dataset?.issuers.find((issuer) => issuer.id === card.issuerId)?.name || "";
                        const isActive = activeCardId === card.id;

                        return (
                          <button
                            type="button"
                            key={card.id}
                            className={`wallet-card ${getCardThemeClass(card.id, card.network)} ${isActive ? "wallet-card--active" : "wallet-card--collapsed"}`}
                            onClick={() => setActiveCardId(card.id)}
                            aria-pressed={isActive}
                            aria-label={isActive ? `${card.name}, selected` : `Select ${card.name}`}
                          >
                            <span className="card-texture" aria-hidden="true" />
                            {isActive ? (
                              <>
                                <span className="wallet-card__topline">
                                  <span className="card-issuer-name">{issuerName}</span>
                                  <svg className="contactless-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: "16px", height: "16px", opacity: 0.8 }}>
                                    <path d="M5 17a8 8 0 0 1 0-10" />
                                    <path d="M9 19a12 12 0 0 1 0-14" />
                                    <path d="M13 21a16 16 0 0 1 0-18" />
                                  </svg>
                                </span>
                                <span className="wallet-card__middle">
                                  <span className="card-chip" aria-hidden="true" />
                                  <span className="card-number-embossed">
                                    •••• •••• •••• {card.id.length > 4 ? card.id.slice(-4) : (card.id.charCodeAt(0) % 10).toString() + (card.id.charCodeAt(card.id.length - 1) % 10).toString() + "42"}
                                  </span>
                                </span>
                                <span className="wallet-card__details">
                                  <span className="wallet-card__bottom-row">
                                    <span className="card-holder-info">
                                      <span className="card-name-display">{card.name}</span>
                                      <span className="card-expiry-embossed">
                                        <span className="expiry-label">VALID THRU</span>
                                        <span className="expiry-value">12/29</span>
                                      </span>
                                    </span>
                                    <CardNetworkLogo network={card.network} />
                                  </span>
                                </span>
                              </>
                            ) : (
                              <span className="wallet-card__collapsed-row">
                                <span className="card-issuer-name">{issuerName}</span>
                                <span className="card-name-display">{card.name}</span>
                                <CardNetworkLogo network={card.network} />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {activeCard && (
                      <div className="card-config-box">
                        <div className="card-config-header">
                          <span className="card-config-title">
                            Selected Card Settings
                          </span>
                          <button
                            type="button"
                            className="text-action text-action--danger"
                            onClick={() => handleToggleCard(activeCard.id)}
                          >
                            Remove from Wallet
                          </button>
                        </div>
                        <div className="card-config-spend-row">
                          <label htmlFor={`monthly-spend-${activeCard.id}`} className="card-config-label">Spent this month:</label>
                          <div className="spend-input-wrapper spend-input-wrapper--small">
                            <span className="currency-prefix">EUR</span>
                            <input
                              id={`monthly-spend-${activeCard.id}`}
                              aria-label={`Spent this month on ${activeCard.name}`}
                              type="number"
                              min="0"
                              value={cardMonthlySpends[activeCard.id] || ""}
                              onChange={(e) => handleUpdateMonthlySpend(activeCard.id, Number(e.target.value) || 0)}
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div className="wallet-actions">
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={handleOpenCatalog}
                  >
                    + Add Cards
                  </button>

                  <details className="wallet-menu">
                    <summary className="wallet-menu__trigger" role="button" aria-label="Wallet options">•••</summary>
                    <div className="wallet-menu__popover">
                      {ownedCardIds.length > 0 && (
                        <>
                          <button type="button" onClick={handleExportWallet}>Export wallet</button>
                          <button
                            type="button"
                            className="wallet-menu__danger"
                            onClick={() => {
                              if (confirm("Are you sure you want to clear your wallet?")) {
                                setOwnedCardIds([]);
                                localStorage.setItem(`cardpin:owned_cards:${country}`, JSON.stringify([]));
                              }
                            }}
                          >
                            Clear wallet
                          </button>
                        </>
                      )}
                      <label>
                        Import wallet
                        <input
                          type="file"
                          accept=".json"
                          onChange={handleImportWallet}
                          className="visually-hidden"
                        />
                      </label>
                    </div>
                  </details>
                </div>
              </section>
            </div>

            <div className="right-column">
              <section className="card step-card step-card--search">
                <div className="step-header">
                  <div className="step-icon-wrapper">
                    <SearchIcon />
                  </div>
                  <div className="step-title-block">
                    <div className="step-kicker">Step 3</div>
                    <h2>Search Purchase</h2>
                  </div>
                </div>
                <p className="helper-text prominent">Search a merchant or choose a category. You can use either one.</p>
                
                <div className="search-card-content-wrapper">
                  <fieldset className="search-fields" disabled={ownedCards.length === 0}>
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="merchant-input">Merchant</label>
                        <input
                          id="merchant-input"
                          type="text"
                          placeholder="Carrefour, Q8, Booking.com"
                          value={merchantQuery}
                          onChange={(event) => setMerchantQuery(event.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="category-select">Category</label>
                        <select id="category-select" value={categoryQuery} onChange={(event) => setCategoryQuery(event.target.value)}>
                          <option value="">Choose a category</option>
                          {categoriesList.map((category) => (
                            <option key={category} value={category}>
                              {formatCategory(category)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group" style={{ flex: "2" }}>
                        <label htmlFor="spend-input">Spend Amount</label>
                        <div className="spend-input-wrapper">
                          <span className="currency-prefix">{spendCurrency}</span>
                          <input
                            id="spend-input"
                            inputMode="decimal"
                            type="number"
                            min="0"
                            value={spendInput}
                            onBlur={handleSpendBlur}
                            onChange={(event) => setSpendInput(event.target.value)}
                          />
                        </div>
                      </div>

                      <div className="form-group" style={{ flex: "1" }}>
                        <label htmlFor="currency-select">Currency</label>
                        <select
                          id="currency-select"
                          value={spendCurrency}
                          onChange={(e) => setSpendCurrency(e.target.value)}
                        >
                          <option value="EUR">EUR (€)</option>
                          <option value="USD">USD ($)</option>
                          <option value="GBP">GBP (£)</option>
                          <option value="CHF">CHF (₣)</option>
                          <option value="JPY">JPY (¥)</option>
                        </select>
                      </div>
                    </div>
                    
                    <p className="helper-text" style={{ marginTop: "10px", fontSize: "0.82rem" }}>
                      Selecting a non-EUR currency fetches live exchange rates and automatically applies the card&apos;s foreign transaction fee.
                    </p>
                  </fieldset>

                  {ownedCards.length === 0 && (
                    <div className="search-lock-overlay">
                      <div className="search-lock-message">
                        <span className="lock-icon" role="img" aria-label="lock">🔒</span>
                        <h3>Search is Locked</h3>
                        <p style={{ marginBottom: "16px" }}>Add at least one card to your wallet in Step 2 to search merchants and optimize rewards.</p>
                        <button type="button" className="btn btn--primary prerequisite-action" onClick={handleOpenCatalog}>
                          Add a Card to Unlock
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section className="recommendation-area">
                {ownedCards.length === 0 ? (
                  <div className="card empty-state">
                    <CreditCardPlaceholder />
                    <strong>No cards selected.</strong>
                    <p>
                      Select cards in your wallet under <strong>Step 2</strong> to start comparing rewards.
                    </p>
                  </div>
                ) : !hasSearch ? (
                  <div className="card empty-state">
                    <CreditCardPlaceholder />
                    <strong>Ready to search.</strong>
                    <p>
                      Enter a merchant or choose a category under <strong>Step 3</strong> to calculate expected rewards.
                    </p>
                  </div>
                ) : isFxRateMissing ? (
                  <div className="card empty-state" role="status">
                    <CreditCardPlaceholder />
                    <strong>{fxStatus === "error" ? "Exchange rate unavailable." : "Loading exchange rate…"}</strong>
                    <p>
                      {fxStatus === "error"
                        ? "Reconnect and select the currency again to calculate accurate rewards."
                        : `Waiting for the ${spendCurrency} rate before calculating rewards.`}
                    </p>
                  </div>
                ) : bestResult ? (
                  <div className="result-box">
                    <div className="result-header">
                      <div>
                        <span className="badge">Best Card</span>
                        <h2>{bestResult.card.name}</h2>
                        <p className="card-meta">
                          {bestResult.card.network.toUpperCase()} · {bestResult.label}
                        </p>
                      </div>
                      <div className="val-display">
                        <div className="val-amount">{rewardAmount(bestResult)}</div>
                        <div className="val-label">Expected reward</div>
                      </div>
                    </div>

                    <div className="result-grid">
                      <div>
                        <h3>Why this card</h3>
                        <p className="result-explanation">{cleanExplanation(bestResult.rec.explanation)}</p>
                      </div>
                      <div>
                        <h3>Spend calculation</h3>
                        <p className="result-calculation">
                          EUR {spendAmount.toFixed(2)} spend · {rewardLabel(bestResult)}
                          {isForeignSpend ? ` · EUR ${bestResult.fxFee.toFixed(2)} FX fee` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="source-strip">
                      {bestResult.rule && (
                        <a href={bestResult.rule.source.sourceUrl} target="_blank" rel="noopener noreferrer">
                          Reward source
                        </a>
                      )}
                      {bestResult.card.sourceProof && (
                        <a href={bestResult.card.sourceProof.sourceUrl} target="_blank" rel="noopener noreferrer">
                          Card source
                        </a>
                      )}
                      <span>Verified {bestResult.rule?.source.verifiedAt ?? bestResult.card.sourceProof?.verifiedAt ?? "unknown"}</span>
                    </div>

                    {alternatives.length > 0 && (
                      <div className="alternatives-container">
                        <h3>Alternatives</h3>
                        {alternatives.map((result) => {
                          const bestValue = bestResult ? bestResult.netValue : 0;
                          const percentage = bestValue > 0 ? Math.min(100, Math.max(0, (result.netValue / bestValue) * 100)) : 0;
                          return (
                            <div className="alt-card" key={result.card.id}>
                              <div className="alt-card-bar" style={{ width: `${percentage}%` }} />
                              <span className="alt-name">{result.card.name}</span>
                              <span className="alt-value">{result.rule ? rewardAmount(result) : "No sourced reward"}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="card empty-state empty-state--left">
                    <strong>No matching reward rules found.</strong>
                    <p>
                      Unsupported cards or rewards are intentionally omitted rather than assumed or guessed.
                    </p>
                    <p>
                      Please verify terms with your issuer before relying on any benefit.
                    </p>
                  </div>
                )}
              </section>
            </div>
          </div>
        </main>
        </>
      )}

      {isDevMode && (
        <button className="dev-floating-btn" onClick={() => setShowDevPanel(true)}>
          🔧 Dev Tools
        </button>
      )}

      {showDevPanel && (
        <div className="modal-overlay" onClick={() => setShowDevPanel(false)}>
          <div className="dev-panel" onClick={(e) => e.stopPropagation()}>
            <div className="dev-panel-header">
              <h3>Developer Data Manager</h3>
              <button className="dev-close-btn" onClick={() => setShowDevPanel(false)}>&times;</button>
            </div>
            <div className="dev-panel-body">
              <div className="dev-flex-row">
                <div className="dev-flex-col">
                  <label htmlFor="dev-country" className="dev-label">Country</label>
                  <select
                    id="dev-country"
                    value={devCountry}
                    onChange={(e) => setDevCountry(e.target.value)}
                    className="dev-select"
                  >
                    <option value="be">Belgium (BE)</option>
                    <option value="de">Germany (DE)</option>
                    <option value="nl">Netherlands (NL)</option>
                  </select>
                </div>
                <div className="dev-flex-col">
                  <label htmlFor="dev-datatype" className="dev-label">Data Type</label>
                  <select
                    id="dev-datatype"
                    value={devDataType}
                    onChange={(e) => setDevDataType(e.target.value)}
                    className="dev-select"
                  >
                    <option value="issuers">Issuers</option>
                    <option value="cards">Cards</option>
                    <option value="merchants">Merchants</option>
                    <option value="rewardRules">Reward Rules</option>
                  </select>
                </div>
              </div>

              <div className="dev-flex-col">
                <label htmlFor="dev-json" className="dev-label">
                  Paste JSON Array or Object
                </label>
                <textarea
                  id="dev-json"
                  className="dev-panel-textarea"
                  value={devJson}
                  onChange={(e) => setDevJson(e.target.value)}
                  placeholder={`Example:\n{\n  "id": "new-item",\n  "name": "New Item"\n}`}
                />
              </div>

              {devStatus && (
                <div
                  className={`dev-status-msg dev-status-msg--${devStatus.type}`}
                >
                  {devStatus.message}
                </div>
              )}

              <button
                type="button"
                onClick={handleMergeSubmit}
                disabled={devStatus?.type === "loading"}
                className="dev-submit-btn"
              >
                Merge & Recompile Datasets
              </button>
            </div>
          </div>
        </div>
      )}

      <dialog
        ref={catalogDialogRef}
        className="catalog-dialog"
        aria-labelledby="catalog-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) handleCloseCatalog();
        }}
      >
          <div className="dev-panel catalog-panel">
            <div className="dev-panel-header">
              <h2 id="catalog-title">Card Catalog ({country.toUpperCase()})</h2>
              <button type="button" className="dev-close-btn" aria-label="Close card catalog" onClick={handleCloseCatalog}>
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="dev-panel-body">
              <div className="search-input-wrapper">
                <input
                  ref={catalogSearchRef}
                  type="text"
                  className="search-input-field"
                  placeholder="Search by card name or issuer..."
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                />
              </div>

              {catalogCards.length === 0 ? (
                <div className="empty-state empty-state--spaced">
                  No cards match your search.
                </div>
              ) : (
                <div className="catalog-grid">
                  {catalogCards.map((card) => {
                    const isSelected = ownedCardIds.includes(card.id);
                    const issuerName = dataset?.issuers.find((i) => i.id === card.issuerId)?.name || "";
                    return (
                      <button
                        type="button"
                        key={card.id}
                        className={`catalog-card-item ${isSelected ? "catalog-card-item--selected" : ""}`}
                        onClick={() => handleToggleCard(card.id)}
                      >
                        <div className="catalog-card-info">
                          <span className="catalog-card-issuer">{issuerName}</span>
                          <span className="catalog-card-name">{card.name}</span>
                          <span className="catalog-card-meta">
                            {card.network.toUpperCase()} · Fee: EUR {card.annualFee} · FX: {((card.fxFeePercentage ?? 0) * 100).toFixed(1)}%
                          </span>
                        </div>
                        <span className={`catalog-card-badge ${isSelected ? "catalog-card-badge--selected" : ""}`}>
                          {isSelected ? "In Wallet" : "Add"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
      </dialog>
    </>
  );
}
