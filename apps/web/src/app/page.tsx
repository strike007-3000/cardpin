"use client";

import { useEffect, useState } from "react";
import { recommendBestCard } from "@cardpin/engine";
import type { CountryDataset, Card, Merchant } from "@cardpin/engine";

export default function HomePage() {
  const [country, setCountry] = useState<string>("be");
  const [dataset, setDataset] = useState<CountryDataset | null>(null);
  const [ownedCardIds, setOwnedCardIds] = useState<string[]>([]);
  const [merchantQuery, setMerchantQuery] = useState<string>("");
  const [categoryQuery, setCategoryQuery] = useState<string>("");
  const [spendAmount, setSpendAmount] = useState<number>(100);
  const [isForeignSpend, setIsForeignSpend] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [audience, setAudience] = useState<"consumer" | "business">("consumer");

  // 1. Fetch country dataset dynamically
  useEffect(() => {
    async function fetchDataset() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/data/${country.toLowerCase()}.json`);
        if (!res.ok) {
          throw new Error(`Country data not available: ${res.statusText}`);
        }
        const data = (await res.json()) as CountryDataset;
        setDataset(data);

        // Load owned cards from localStorage for this country
        const saved = localStorage.getItem(`cardpin:owned_cards:${country}`);
        if (saved) {
          const parsed = JSON.parse(saved) as string[];
          const validIds = parsed.filter((id: string) => data.cards.some((c: Card) => c.id === id));
          setOwnedCardIds(validIds);
        } else {
          // Default: own all cards on first visit
          const allIds = data.cards.map((c: Card) => c.id);
          setOwnedCardIds(allIds);
          localStorage.setItem(`cardpin:owned_cards:${country}`, JSON.stringify(allIds));
        }
      } catch (err: any) {
        setError(err.message || "Failed to load country dataset.");
      } finally {
        setLoading(false);
      }
    }

    fetchDataset();
  }, [country]);

  // 2. Persist owned cards to localStorage
  const handleToggleCard = (cardId: string) => {
    const updated = ownedCardIds.includes(cardId)
      ? ownedCardIds.filter((id: string) => id !== cardId)
      : [...ownedCardIds, cardId];
    setOwnedCardIds(updated);
    localStorage.setItem(`cardpin:owned_cards:${country}`, JSON.stringify(updated));
  };

  // Get categories from merchants
  const categoriesList: string[] = Array.from(
    new Set(dataset?.merchants.flatMap((m: Merchant) => m.categories) ?? [])
  ).sort();

  // Filter cards to only those owned and matching selected audience
  const ownedCards = dataset
    ? dataset.cards.filter((c: Card) => ownedCardIds.includes(c.id) && (c.audience ?? "consumer") === audience)
    : [];

  // 3. Run recommendation engine per card to group by points/miles/cashback
  const cardResults = dataset && ownedCards.length > 0
    ? ownedCards.map((card) => {
        const rec = recommendBestCard({
          merchant: merchantQuery,
          category: categoryQuery,
          ownedCards: [card],
          country: country.toUpperCase(),
          dataset,
          spendAmount,
          isForeignSpend,
          valuations: { points: 1, miles: 1 } // order won't change as we run single card
        });
        
        const rule = rec.bestRule;
        const rewardType = rec.rewardType;
        const fxFee = isForeignSpend ? spendAmount * (card.fxFeePercentage ?? 0) : 0;
        
        let grossNum = 0;
        let rateLabel = "";
        let rewardUnit = "";
        
        if (rule) {
          if (rewardType === "cashback_percentage") {
            grossNum = spendAmount * rule.rewardValue;
            rateLabel = `${(rule.rewardValue * 100).toFixed(1)}%`;
            rewardUnit = "EUR";
          } else if (rewardType === "fixed_cashback") {
            grossNum = rule.rewardValue;
            rateLabel = `€${rule.rewardValue.toFixed(2)}`;
            rewardUnit = "fixed";
          } else if (rewardType === "points") {
            // points rule.rewardValue is points per Euro spent
            grossNum = spendAmount * rule.rewardValue;
            rateLabel = `${rule.rewardValue}x`;
            rewardUnit = "Points";
          } else if (rewardType === "miles") {
            // miles rule.rewardValue is miles per Euro spent
            grossNum = spendAmount * rule.rewardValue;
            rateLabel = `${rule.rewardValue}x`;
            rewardUnit = "Miles";
          }
        }
        
        return {
          card,
          rec,
          rule,
          rewardType,
          fxFee,
          grossNum,
          rateLabel,
          rewardUnit
        };
      })
    : [];

  const bestCashback = cardResults
    .filter(r => r.rewardType === "cashback_percentage" || r.rewardType === "fixed_cashback")
    .sort((a, b) => (b.grossNum - b.fxFee) - (a.grossNum - a.fxFee))[0] || null;

  const bestPoints = cardResults
    .filter(r => r.rewardType === "points")
    .sort((a, b) => b.grossNum - a.grossNum)[0] || null;

  const bestMiles = cardResults
    .filter(r => r.rewardType === "miles")
    .sort((a, b) => b.grossNum - a.grossNum)[0] || null;

  const bestFallback = cardResults.length > 0
    ? [...cardResults].sort((a, b) => a.fxFee - b.fxFee)[0]
    : null;

  // Runtime calculation for data confidence score
  const getConfidenceScore = (verifiedAtStr: string | undefined): { score: number; label: string; color: string } => {
    if (!verifiedAtStr) return { score: 0.1, label: "Unverified", color: "#ef4444" };
    const verifiedTime = new Date(verifiedAtStr).getTime();
    if (isNaN(verifiedTime)) return { score: 0.1, label: "Unverified", color: "#ef4444" };

    const days = Math.floor((Date.now() - verifiedTime) / (1000 * 60 * 60 * 24));
    const score = Math.max(0.1, 1.0 - days * 0.001);
    
    let label = "Trusted & Fresh";
    let color = "#10b981"; // Emerald green

    if (days > 180) {
      label = "Data Stale - Update Needed";
      color = "#f59e0b"; // Orange/Yellow
    }
    if (days > 365) {
      label = "Stale (Requires Verification)";
      color = "#ef4444"; // Red
    }

    return { score, label, color };
  };

  return (
    <div className="container">
      <header>
        <h1>CardPin</h1>
        <p className="subtitle">
          Free, privacy-first, offline-ready payment card reward recommendations.
        </p>
      </header>

      {error && (
        <div className="card" style={{ borderColor: "rgba(239, 68, 68, 0.4)", background: "rgba(239, 68, 68, 0.05)" }}>
          <h2 style={{ color: "#ef4444" }}>Error</h2>
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="loading-container">Loading card datasets...</div>
      ) : (
        <div className="grid-layout">
          {/* Left Column: Config */}
          <div className="left-col">
            <div className="card">
              <h2>Select Country & Spend</h2>
              <div className="form-group">
                <label htmlFor="country-select">Country Code</label>
                <select
                  id="country-select"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                >
                  <option value="be">BE (Belgium)</option>
                  <option value="nl">NL (Netherlands)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Audience Type</label>
                <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                  <button
                    type="button"
                    style={{
                      flex: 1,
                      padding: "8px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      border: "1px solid var(--color-primary)",
                      backgroundColor: audience === "consumer" ? "var(--color-primary)" : "transparent",
                      color: audience === "consumer" ? "#000" : "var(--text-main)",
                      fontWeight: 600
                    }}
                    onClick={() => setAudience("consumer")}
                  >
                    Personal
                  </button>
                  <button
                    type="button"
                    style={{
                      flex: 1,
                      padding: "8px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      border: "1px solid var(--color-primary)",
                      backgroundColor: audience === "business" ? "var(--color-primary)" : "transparent",
                      color: audience === "business" ? "#000" : "var(--text-main)",
                      fontWeight: 600
                    }}
                    onClick={() => setAudience("business")}
                  >
                    Business
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="spend-input">Estimated Spend Amount (€)</label>
                <input
                  id="spend-input"
                  type="number"
                  min="0"
                  value={spendAmount}
                  onChange={(e) => setSpendAmount(Math.max(0, Number(e.target.value)))}
                />
              </div>

              <div className="form-group" style={{ display: "flex", alignItems: "center", marginTop: "12px", gap: "8px" }}>
                <input
                  id="foreign-spend-checkbox"
                  type="checkbox"
                  checked={isForeignSpend}
                  onChange={(e) => setIsForeignSpend(e.target.checked)}
                  style={{ width: "20px", height: "20px", cursor: "pointer" }}
                />
                <label htmlFor="foreign-spend-checkbox" style={{ margin: 0, cursor: "pointer", userSelect: "none" }}>
                  Is Foreign Currency Spends?
                </label>
              </div>
            </div>

            <div className="card">
              <h2>Your Owned Cards</h2>
              <p className="val-label" style={{ marginBottom: "12px" }}>
                Toggle which cards are in your wallet:
              </p>
              {dataset?.cards.filter((c: Card) => (c.audience ?? "consumer") === audience).length === 0 ? (
                <div className="empty-state">No {audience} cards available for {country.toUpperCase()}.</div>
              ) : (
                <div className="card-list">
                  {dataset?.cards.filter((c: Card) => (c.audience ?? "consumer") === audience).map((card: Card) => {
                    const isSelected = ownedCardIds.includes(card.id);
                    return (
                      <div
                        key={card.id}
                        className={`card-item ${isSelected ? "selected" : ""}`}
                        onClick={() => handleToggleCard(card.id)}
                      >
                        <div className="checkbox-custom" />
                        <div className="card-info">
                          <span className="card-name">{card.name}</span>
                          <span className="card-meta">
                            {card.issuerId.toUpperCase()} • {card.network} • {(card.fxFeePercentage * 100).toFixed(1)}% FX
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Search & Recommendations */}
          <div className="right-col">
            <div className="card">
              <h2>Find Best Reward</h2>
              <div className="form-group">
                <label htmlFor="merchant-input">Merchant Name</label>
                <input
                  id="merchant-input"
                  type="text"
                  placeholder="e.g. Carrefour, Uber, Booking.com"
                  value={merchantQuery}
                  onChange={(e) => setMerchantQuery(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="category-select">Category</label>
                <select
                  id="category-select"
                  value={categoryQuery}
                  onChange={(e) => setCategoryQuery(e.target.value)}
                >
                  <option value="">-- Choose Category --</option>
                  {categoriesList.map((cat: string) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Recommendation Outputs and Empty States */}
            {(() => {
              if (ownedCardIds.length === 0) {
                return (
                  <div className="card" style={{ borderColor: "rgba(245, 158, 11, 0.4)", background: "rgba(245, 158, 11, 0.03)" }}>
                    <div className="empty-state">
                      <h3 style={{ color: "#f59e0b", marginBottom: "8px", fontWeight: 600 }}>No Cards Selected</h3>
                      Please select one or more owned cards in the left panel to receive recommendations.
                    </div>
                  </div>
                );
              }

              if (merchantQuery === "" && categoryQuery === "") {
                return (
                  <div className="card">
                    <div className="empty-state">
                      <h3 style={{ color: "var(--text-main)", marginBottom: "8px", fontWeight: 600 }}>Start Search</h3>
                      Type a merchant name or choose a category to find the best payment card for your transaction.
                    </div>
                  </div>
                );
              }

              const hasRecommendations = bestCashback || bestPoints || bestMiles;

              const renderRecommendationBox = (
                title: string,
                result: typeof bestCashback,
                colorBadgeClass = ""
              ) => {
                if (!result) return null;
                const isStale = result.rule ? (result.rule.rewardValue === 0) : true;
                const confidence = getConfidenceScore(result.rule?.source.verifiedAt);
                
                // Calculate math details
                const fxFeeAmount = result.fxFee;
                const grossText = result.rewardType === "cashback_percentage"
                  ? `€${result.grossNum.toFixed(2)} (${result.rateLabel} reward)`
                  : result.rewardType === "fixed_cashback"
                  ? `€${result.grossNum.toFixed(2)} (fixed)`
                  : result.rewardType === "points"
                  ? `${result.grossNum.toFixed(0)} Points (${result.rateLabel} multiplier)`
                  : result.rewardType === "miles"
                  ? `${result.grossNum.toFixed(0)} Miles (${result.rateLabel} multiplier)`
                  : "";

                let netText = "";
                if (result.rewardType === "cashback_percentage" || result.rewardType === "fixed_cashback") {
                  netText = `€${Math.max(0, result.grossNum - fxFeeAmount).toFixed(2)} Net Value`;
                } else {
                  netText = `${result.grossNum.toFixed(0)} ${result.rewardUnit} ${isForeignSpend ? `(minus €${fxFeeAmount.toFixed(2)} FX fee)` : ""}`;
                }

                return (
                  <div className="result-box" style={{ marginBottom: "24px", position: "relative" }} key={title}>
                    <div className="result-header">
                      <div>
                        <span className={`badge ${colorBadgeClass}`}>
                          {title}
                        </span>
                        <h3 style={{ fontSize: "1.6rem", fontWeight: 700, marginTop: "8px" }}>
                          {result.card.name}
                        </h3>
                        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                          Issuer: {result.card.issuerId.toUpperCase()} • Network: {result.card.network.toUpperCase()}
                        </p>
                      </div>

                      <div className="val-display">
                        <div className="val-amount" style={{ fontSize: "1.8rem" }}>
                          {result.rewardType === "cashback_percentage"
                            ? `${(result.rule?.rewardValue ? result.rule.rewardValue * 100 : 0).toFixed(1)}%`
                            : result.rewardType === "fixed_cashback"
                            ? `€${result.rule?.rewardValue}`
                            : result.rateLabel}
                        </div>
                        <div className="val-label">
                          Rate
                        </div>
                      </div>
                    </div>

                    {/* Math Breakdown Box */}
                    <div style={{ marginTop: "16px", padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <p style={{ fontWeight: 600, fontSize: "0.8rem", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "6px" }}>
                        Math Breakdown
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.9rem" }}>
                        <div>Spend Basis: <strong>€{spendAmount.toFixed(2)}</strong></div>
                        <div>Gross Reward: <strong>{grossText}</strong></div>
                        {isForeignSpend && (
                          <div style={{ color: "#f87171" }}>
                            FX Fee Penalty: <strong>-€{fxFeeAmount.toFixed(2)}</strong> ({(result.card.fxFeePercentage * 100).toFixed(1)}% fee)
                          </div>
                        )}
                        <div style={{ borderTop: "1px dashed rgba(255,255,255,0.1)", marginTop: "6px", paddingTop: "6px", color: "var(--color-accent)", fontWeight: 700 }}>
                          Estimated Net: {netText}
                        </div>
                      </div>
                    </div>

                    {isStale && (
                      <div style={{ margin: "12px 0", padding: "8px 12px", background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.2)", borderRadius: "6px", fontSize: "0.85rem", color: "#f59e0b" }}>
                        ⚠️ No Extra Reward Advantage. The recommended card will earn its general fallback rate (or has 0% reward yield for this spend).
                      </div>
                    )}

                    <div style={{ marginTop: "16px", padding: "12px", background: "rgba(255,255,255,0.01)", borderRadius: "6px" }}>
                      <p style={{ fontWeight: 600, fontSize: "0.8rem", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "4px" }}>
                        Why This Recommendation
                      </p>
                      <p className="explanation-text" style={{ fontSize: "0.9rem", margin: 0 }}>
                        {result.rec.explanation}
                      </p>
                    </div>

                    {/* Card fee & verification attribution */}
                    {result.card.sourceProof && (
                      <div style={{ marginTop: "12px", padding: "8px 12px", background: "rgba(6, 182, 212, 0.05)", borderRadius: "6px", fontSize: "0.8rem", border: "1px dashed rgba(6, 182, 212, 0.2)" }}>
                        <span style={{ fontWeight: 600, textTransform: "uppercase", color: "var(--color-accent-blue)", fontSize: "0.75rem" }}>Card Specs Sourced: </span>
                        <a href={result.card.sourceProof.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-accent-blue)", textDecoration: "underline" }}>
                          Official Terms
                        </a>{" "}
                        • Verified: {result.card.sourceProof.verifiedAt} by @{result.card.sourceProof.verifiedBy}
                      </div>
                    )}

                    {result.rule && (
                      <div style={{ marginTop: "12px", fontSize: "0.8rem", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "12px" }}>
                        <p style={{ fontWeight: 600, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "8px" }}>
                          Reward Rule Sourced
                        </p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
                          <span>
                            Source:{" "}
                            <a
                              href={result.rule.source.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: "var(--color-primary)", textDecoration: "underline" }}
                            >
                              Official Terms
                            </a>
                          </span>
                          <span>Verified At: {result.rule.source.verifiedAt}</span>
                          <span>Contributor: @{result.rule.source.verifiedBy}</span>
                        </div>
                        
                        <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                          <span
                            style={{
                              display: "inline-block",
                              width: "8px",
                              height: "8px",
                              borderRadius: "50%",
                              backgroundColor: confidence.color
                            }}
                          />
                          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                            {confidence.label} (Freshness Score: {(confidence.score * 100).toFixed(0)}%)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              };

              if (hasRecommendations) {
                return (
                  <div>
                    {renderRecommendationBox("Best Cashback Card", bestCashback)}
                    {renderRecommendationBox("Best Points Card", bestPoints, "badge-points")}
                    {renderRecommendationBox("Best Miles Card", bestMiles, "badge-points")}
                  </div>
                );
              }

              // Fallback card when no rules match
              if (bestFallback) {
                return (
                  <div>
                    <div className="card" style={{ borderColor: "rgba(255, 255, 255, 0.15)", background: "rgba(255, 255, 255, 0.02)" }}>
                      <h3 style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: "8px" }}>No Specific Rewards</h3>
                      <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "16px" }}>
                        None of your owned cards have active reward rules matching this query. Using a card with the lowest foreign transaction fees is recommended:
                      </p>
                    </div>
                    {renderRecommendationBox("Recommended Fallback Card", bestFallback, "badge-points")}
                  </div>
                );
              }

              return (
                <div className="card">
                  <div className="empty-state">
                    <h3 style={{ color: "var(--text-main)", marginBottom: "8px", fontWeight: 600 }}>No Cards Available</h3>
                    You do not own any cards that can process this transaction.
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
      <footer className="site-footer">
        CardPin is not financial advice. Data is community-sourced and may be inaccurate. Verify terms with your card issuer.
      </footer>
    </div>
  );
}
