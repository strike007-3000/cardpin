"use client";

import { useEffect, useMemo, useState } from "react";
import { recommendBestCard } from "@cardpin/engine";
import type { Card, CountryDataset, Merchant } from "@cardpin/engine";

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

export default function HomePage() {
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

  const [showWelcome, setShowWelcome] = useState<boolean>(false);
  const [showFullInstructions, setShowFullInstructions] = useState<boolean>(false);
  const [cardSearchQuery, setCardSearchQuery] = useState<string>("");
  const [collapsedIssuers, setCollapsedIssuers] = useState<Set<string>>(new Set());

  const spendAmount = normalizeSpend(spendInput);

  useEffect(() => {
    const dismissed = localStorage.getItem("cardpin:welcome_dismissed");
    if (!dismissed) {
      setShowWelcome(true);
    }
  }, []);

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

  const categoriesList = useMemo(
    () => Array.from(new Set(dataset?.merchants.flatMap((merchant: Merchant) => merchant.categories) ?? [])).sort(),
    [dataset]
  );

  const cardsByIssuer = useMemo(() => {
    const filtered = availableCards.filter((card) => {
      if (!cardSearchQuery.trim()) return true;
      const q = cardSearchQuery.toLowerCase();
      const issuer = dataset?.issuers.find((i) => i.id === card.issuerId);
      return card.name.toLowerCase().includes(q) || (issuer?.name.toLowerCase().includes(q) ?? false);
    });

    const groups: Record<string, { name: string; cards: Card[] }> = {};

    dataset?.issuers.forEach((issuer) => {
      groups[issuer.id] = { name: issuer.name, cards: [] };
    });

    filtered.forEach((card) => {
      if (!groups[card.issuerId]) {
        groups[card.issuerId] = { name: "Other", cards: [] };
      }
      groups[card.issuerId].cards.push(card);
    });

    return Object.entries(groups)
      .filter(([_, group]) => group.cards.length > 0)
      .map(([id, group]) => ({ id, ...group }));
  }, [availableCards, cardSearchQuery, dataset]);

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

  function handleToggleIssuer(issuerId: string) {
    setCollapsedIssuers((prev) => {
      const next = new Set(prev);
      if (next.has(issuerId)) {
        next.delete(issuerId);
      } else {
        next.add(issuerId);
      }
      return next;
    });
  }

  function handleSpendBlur() {
    const parsed = Number(spendInput);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setSpendInput("50");
    } else {
      setSpendInput(String(parsed));
    }
  }

  const cardResults: CardCalc[] = useMemo(() => {
    if (!dataset || !ownedCards.length) return [];

    return ownedCards
      .map((card) => {
        const rec = recommendBestCard({
          merchant: merchantQuery,
          category: categoryQuery,
          ownedCards: [card],
          country: country.toUpperCase(),
          dataset,
          spendAmount,
          isForeignSpend,
          valuations: { points: 1, miles: 1 }
        });
        const rule = rec.bestRule;
        const fxFee = isForeignSpend ? spendAmount * (card.fxFeePercentage ?? 0) : 0;
        let grossValue = 0;

        if (rule?.rewardType === "cashback_percentage") grossValue = spendAmount * rule.rewardValue;
        if (rule?.rewardType === "fixed_cashback") grossValue = rule.rewardValue;
        if (rule?.rewardType === "points" || rule?.rewardType === "miles") grossValue = spendAmount * rule.rewardValue;

        const netValue = rule?.rewardType === "cashback_percentage" || rule?.rewardType === "fixed_cashback"
          ? Math.max(0, grossValue - fxFee)
          : grossValue;

        return {
          card,
          rule,
          rec,
          rewardType: rec.rewardType,
          grossValue,
          fxFee,
          netValue,
          label: rewardLabel({
            card,
            rule,
            rec,
            rewardType: rec.rewardType,
            grossValue,
            fxFee,
            netValue,
            label: ""
          })
        };
      })
      .sort((a, b) => b.netValue - a.netValue);
  }, [categoryQuery, country, dataset, isForeignSpend, merchantQuery, ownedCards, spendAmount]);

  const hasSearch = merchantQuery.trim() !== "" || categoryQuery !== "";
  const bestResult = cardResults.find((result) => result.rule) ?? null;
  const alternatives = cardResults.filter((result) => result.card.id !== bestResult?.card.id).slice(0, 4);

  return (
    <div className="container">
      <header>
        <h1>CardPin</h1>
        <p className="subtitle">Find the best card from the cards you actually have.</p>
      </header>

      {error && (
        <div className="card error-card">
          <h2>Error</h2>
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="loading-container">Loading card datasets...</div>
      ) : (
        <>
          {showWelcome && (
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
                    {showFullInstructions ? "Hide details" : "How it works & Data transparency"}
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
                    <option value="nl">Netherlands</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Audience</label>
                  <div className="segmented-control" aria-label="Audience">
                    <button type="button" className={audience === "consumer" ? "active" : ""} onClick={() => setAudience("consumer")}>
                      Personal
                    </button>
                    <button type="button" className={audience === "business" ? "active" : ""} onClick={() => setAudience("business")}>
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
                  <div className="section-title-row" style={{ gap: "12px" }}>
                    <h2>Select Your Cards</h2>
                    <span className="quiet-pill">{ownedCards.length} selected</span>
                  </div>
                </div>
              </div>

              <div className="card-search-container">
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <div style={{ position: "relative", flex: "1" }}>
                    <input
                      type="text"
                      placeholder="Search cards or banks..."
                      value={cardSearchQuery}
                      onChange={(e) => setCardSearchQuery(e.target.value)}
                      style={{ minHeight: "38px", fontSize: "0.9rem", padding: "8px 12px", paddingRight: "30px" }}
                    />
                    {cardSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setCardSearchQuery("")}
                        className="dismiss-btn"
                        style={{
                          position: "absolute",
                          right: "8px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          fontSize: "1.1rem"
                        }}
                      >
                        &times;
                      </button>
                    )}
                  </div>
                  {ownedCardIds.length > 0 && (
                    <button
                      type="button"
                      className="deselect-all-btn"
                      onClick={() => {
                        setOwnedCardIds([]);
                        localStorage.setItem(`cardpin:owned_cards:${country}`, JSON.stringify([]));
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {availableCards.length === 0 ? (
                <div className="empty-state compact">No {audience} cards available for {country.toUpperCase()}.</div>
              ) : cardsByIssuer.length === 0 ? (
                <div className="empty-state compact">No cards match &ldquo;{cardSearchQuery}&rdquo;.</div>
              ) : (
                <div className="issuer-accordion-list">
                  {cardsByIssuer.map((group) => {
                    const isCollapsed = collapsedIssuers.has(group.id);
                    const selectedCount = group.cards.filter((c) => ownedCardIds.includes(c.id)).length;
                    return (
                      <div key={group.id} className={`issuer-group ${isCollapsed ? "collapsed" : ""}`}>
                        <button
                          type="button"
                          className="issuer-group-header"
                          onClick={() => handleToggleIssuer(group.id)}
                        >
                          <div className="issuer-header-left">
                            <svg
                              className={`chevron-icon ${isCollapsed ? "" : "rotated"}`}
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                            <span className="issuer-name">{group.name}</span>
                          </div>
                          <span className="issuer-badge">
                            {selectedCount > 0 ? `${selectedCount}/${group.cards.length}` : group.cards.length}
                          </span>
                        </button>

                        {!isCollapsed && (
                          <div className="issuer-group-content">
                            {group.cards.map((card) => {
                              const isSelected = ownedCardIds.includes(card.id);
                              return (
                                <button
                                  type="button"
                                  key={card.id}
                                  className={`card-item ${isSelected ? "selected" : ""}`}
                                  onClick={() => handleToggleCard(card.id)}
                                >
                                  <span className="checkbox-custom" />
                                  <span className="card-info">
                                    <span className="card-name">{card.name}</span>
                                    <span className="card-meta">
                                      {card.network.toUpperCase()} · EUR {card.annualFee}/year · {((card.fxFeePercentage ?? 0) * 100).toFixed(1)}% FX
                                    </span>
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="card step-card">
              <div className="step-header">
                <SearchIcon />
                <div className="step-title-block">
                  <div className="step-kicker">Step 3</div>
                  <h2>Search Merchant & Spend</h2>
                </div>
              </div>
              <p className="helper-text prominent">Search a merchant or choose a category. You can use either one.</p>
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
                <div className="form-group">
                  <label htmlFor="spend-input">Spend Amount</label>
                  <div className="spend-input-wrapper">
                    <span className="currency-prefix">EUR</span>
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

                <div className="toggle-switch-wrapper">
                  <span className="toggle-switch-label">Foreign currency spend</span>
                  <label className="switch" htmlFor="foreign-spend-checkbox">
                    <input
                      id="foreign-spend-checkbox"
                      type="checkbox"
                      checked={isForeignSpend}
                      onChange={(event) => setIsForeignSpend(event.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>
              <p className="helper-text" style={{ marginTop: "10px", fontSize: "0.82rem" }}>
                Enabling foreign spend calculates reward net values by subtracting card foreign exchange fees.
              </p>
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
                      <span className="badge">Best card</span>
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
          </main>
        </>
      )}

      <footer className="site-footer">
        CardPin is not financial advice. Sources and reward rules are community-sourced; always verify current terms with your issuer before use.
      </footer>
    </div>
  );
}

