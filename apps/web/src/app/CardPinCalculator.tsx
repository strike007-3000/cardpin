"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { recommendBestCard } from "@cardpin/engine";
import type { Card, CountryDataset, Merchant } from "@cardpin/engine";
import { needsFxRates, orderCardsForWalletStack } from "../lib/utils";

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
    if (!needsFxRates(spendCurrency)) return;

    async function fetchFXRates() {
      const cached = sessionStorage.getItem("cardpin:fx_rates");
      if (cached) {
        try {
          setFxRates(JSON.parse(cached));
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
          setFxRates(rates);
          sessionStorage.setItem("cardpin:fx_rates", JSON.stringify(rates));
        }
      } catch (err) {
        console.warn("Using offline fallback FX rates");
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

    const rate = fxRates[spendCurrency.toLowerCase()] || 1;
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

          <main className="flow-layout">
            <div className="left-column">
              <section className="card step-card">
                <div className="step-header">
                  <GlobeIcon />
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

              <section className="card step-card">
                <div className="step-header">
                  <WalletIcon />
                  <div className="step-title-block">
                    <div className="step-kicker">Step 2</div>
                    <div className="section-title-row" style={{ gap: "12px", justifyContent: "space-between", width: "100%" }}>
                      <h2>Your Wallet</h2>
                      <span className="quiet-pill">{ownedCards.length} in wallet</span>
                    </div>
                  </div>
                </div>

                {ownedCards.length === 0 ? (
                  <div className="empty-state" style={{ margin: "20px 0" }}>
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
                            className={`wallet-card ${getCardThemeClass(card.id, card.network)} ${isActive ? "wallet-card--active" : ""}`}
                            onClick={() => setActiveCardId(card.id)}
                            aria-pressed={isActive}
                            aria-label={isActive ? `${card.name}, selected` : `Select ${card.name}`}
                          >
                            <span className="wallet-card__topline">
                              <span className="card-issuer-name">{issuerName}</span>
                              <span className="card-chip" aria-hidden="true" />
                            </span>
                            <span className="wallet-card__details">
                              <span className="card-name-display">{card.name}</span>
                              <span className="card-network-logo">{card.network}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {activeCard && (
                      <div className="card-config-box">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.8rem", fontWeight: "bold", color: "var(--text-main)" }}>
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
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px", flexWrap: "wrap" }}>
                          <label htmlFor={`monthly-spend-${activeCard.id}`} style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 0 }}>Spent this month:</label>
                          <div className="spend-input-wrapper" style={{ maxWidth: "120px", display: "flex", alignItems: "center" }}>
                            <span className="currency-prefix">EUR</span>
                            <input
                              id={`monthly-spend-${activeCard.id}`}
                              aria-label={`Spent this month on ${activeCard.name}`}
                              type="number"
                              min="0"
                              value={cardMonthlySpends[activeCard.id] || ""}
                              onChange={(e) => handleUpdateMonthlySpend(activeCard.id, Number(e.target.value) || 0)}
                              placeholder="0"
                              style={{ padding: "4px 8px", fontSize: "0.8rem" }}
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
                  <SearchIcon />
                  <div className="step-title-block">
                    <div className="step-kicker">Step 3</div>
                    <h2>Search Purchase</h2>
                  </div>
                </div>
                <p className="helper-text prominent">Search a merchant or choose a category. You can use either one.</p>
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
                  <button type="button" className="btn btn--primary prerequisite-action" onClick={handleOpenCatalog}>
                    Add a card to continue
                  </button>
                )}
              </section>

              <section className="recommendation-area">
                {ownedCards.length === 0 ? (
                  <div className="card empty-state">
                    <CreditCardPlaceholder />
                    <strong>No cards selected.</strong>
                    <p style={{ marginTop: "6px", fontSize: "0.9rem" }}>
                      Select cards in your wallet under <strong>Step 2</strong> to start comparing rewards.
                    </p>
                  </div>
                ) : !hasSearch ? (
                  <div className="card empty-state">
                    <CreditCardPlaceholder />
                    <strong>Ready to search.</strong>
                    <p style={{ marginTop: "6px", fontSize: "0.9rem" }}>
                      Enter a merchant or choose a category under <strong>Step 3</strong> to calculate expected rewards.
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
                        <p style={{ fontSize: "0.9rem" }}>{bestResult.rec.explanation}</p>
                      </div>
                      <div>
                        <h3>Spend calculation</h3>
                        <p style={{ fontSize: "0.9rem" }}>
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
                        <h3 style={{ marginTop: "8px" }}>Alternatives</h3>
                        {alternatives.map((result) => (
                          <div className="alt-card" key={result.card.id}>
                            <span className="alt-name">{result.card.name}</span>
                            <span className="alt-value">{result.rule ? rewardAmount(result) : "No sourced reward"}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="card empty-state" style={{ textAlign: "left" }}>
                    <strong style={{ display: "block", marginBottom: "6px" }}>No matching reward rules found.</strong>
                    <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: "8px" }}>
                      Unsupported cards or rewards are intentionally omitted rather than assumed or guessed.
                    </p>
                    <p style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
                      Please verify terms with your issuer before relying on any benefit.
                    </p>
                  </div>
                )}
              </section>
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
              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label htmlFor="dev-country" style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Country</label>
                  <select
                    id="dev-country"
                    value={devCountry}
                    onChange={(e) => setDevCountry(e.target.value)}
                    style={{ padding: "8px", background: "var(--bg-surface)", border: "1px solid var(--border-color)", borderRadius: "4px", color: "var(--text-main)" }}
                  >
                    <option value="be">Belgium (BE)</option>
                    <option value="de">Germany (DE)</option>
                    <option value="nl">Netherlands (NL)</option>
                  </select>
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label htmlFor="dev-datatype" style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Data Type</label>
                  <select
                    id="dev-datatype"
                    value={devDataType}
                    onChange={(e) => setDevDataType(e.target.value)}
                    style={{ padding: "8px", background: "var(--bg-surface)", border: "1px solid var(--border-color)", borderRadius: "4px", color: "var(--text-main)" }}
                  >
                    <option value="issuers">Issuers</option>
                    <option value="cards">Cards</option>
                    <option value="merchants">Merchants</option>
                    <option value="rewardRules">Reward Rules</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label htmlFor="dev-json" style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
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
                  style={{
                    padding: "10px 14px",
                    borderRadius: "4px",
                    fontSize: "0.9rem",
                    backgroundColor:
                      devStatus.type === "success"
                        ? "rgba(63, 185, 80, 0.15)"
                        : devStatus.type === "error"
                        ? "rgba(248, 81, 73, 0.15)"
                        : "rgba(88, 166, 255, 0.15)",
                    border:
                      devStatus.type === "success"
                        ? "1px solid rgba(63, 185, 80, 0.3)"
                        : devStatus.type === "error"
                        ? "1px solid rgba(248, 81, 73, 0.3)"
                        : "1px solid rgba(88, 166, 255, 0.3)",
                    color:
                      devStatus.type === "success"
                        ? "#3fb950"
                        : devStatus.type === "error"
                        ? "#f85149"
                        : "#58a6ff"
                  }}
                >
                  {devStatus.message}
                </div>
              )}

              <button
                type="button"
                onClick={handleMergeSubmit}
                disabled={devStatus?.type === "loading"}
                style={{
                  padding: "12px",
                  backgroundColor: "var(--color-primary)",
                  color: "var(--text-inverse)",
                  border: "none",
                  borderRadius: "4px",
                  fontWeight: "bold",
                  cursor: devStatus?.type === "loading" ? "not-allowed" : "pointer",
                  opacity: devStatus?.type === "loading" ? 0.7 : 1
                }}
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
                <div className="empty-state" style={{ margin: "20px 0" }}>
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
                        className="catalog-card-item"
                        onClick={() => handleToggleCard(card.id)}
                        style={{
                          border: isSelected ? "1px solid var(--color-primary)" : "1px solid var(--border-color)",
                          backgroundColor: isSelected ? "rgba(88, 166, 255, 0.05)" : "",
                          textAlign: "left"
                        }}
                      >
                        <div className="catalog-card-info">
                          <span className="catalog-card-issuer">{issuerName}</span>
                          <span className="catalog-card-name">{card.name}</span>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
                            {card.network.toUpperCase()} · Fee: EUR {card.annualFee} · FX: {((card.fxFeePercentage ?? 0) * 100).toFixed(1)}%
                          </span>
                        </div>
                        <span className="catalog-card-badge" style={{
                          backgroundColor: isSelected ? "var(--color-primary)" : "var(--border-color)",
                          color: isSelected ? "#fff" : "var(--text-main)"
                        }}>
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
