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

  const spendAmount = normalizeSpend(spendInput);

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

  function handleToggleCard(cardId: string) {
    const updated = ownedCardIds.includes(cardId)
      ? ownedCardIds.filter((id) => id !== cardId)
      : [...ownedCardIds, cardId];
    setOwnedCardIds(updated);
    localStorage.setItem(`cardpin:owned_cards:${country}`, JSON.stringify(updated));
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
          <section className="card welcome-card" style={{ marginBottom: "20px" }}>
            <h2>How it Works & Data Transparency</h2>
            <div style={{ display: "grid", gap: "20px", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", fontSize: "0.88rem", color: "var(--text-muted)", marginTop: "12px" }}>
              <div>
                <h3 style={{ color: "var(--color-primary)", marginBottom: "6px" }}>1. Select Owned Cards</h3>
                <p>Choose your country and toggle the cards you actually own in **Step 2**. Your selection is saved locally in your browser.</p>
              </div>
              <div>
                <h3 style={{ color: "var(--color-primary)", marginBottom: "6px" }}>2. Search & Compare</h3>
                <p>Type a merchant name or choose a category in **Step 3**, then enter the spend amount to calculate the expected reward.</p>
              </div>
              <div>
                <h3 style={{ color: "var(--color-primary)", marginBottom: "6px" }}>3. Separated Rewards</h3>
                <p>Cashback, points, and miles are separated, not aggregated, because their real-world value depends on how you choose to redeem them.</p>
              </div>
              <div>
                <h3 style={{ color: "var(--color-accent)", marginBottom: "6px" }}>Community-Sourced</h3>
                <p>Data is community-sourced and may be incomplete. Unsupported cards/rewards are intentionally omitted rather than guessed. Check source links before making financial decisions.</p>
              </div>
            </div>
          </section>

          <main className="flow-layout">
            <section className="card step-card">
              <div className="step-kicker">Step 1</div>
              <h2>Choose Country</h2>
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
              <div className="step-kicker">Step 2</div>
              <div className="section-title-row">
                <h2>Select Your Cards</h2>
                <span className="quiet-pill">{ownedCards.length} selected</span>
              </div>
              {availableCards.length === 0 ? (
                <div className="empty-state compact">No {audience} cards available for {country.toUpperCase()}.</div>
              ) : (
                <div className="card-list">
                  {availableCards.map((card) => {
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
            </section>

            <section className="card step-card">
              <div className="step-kicker">Step 3</div>
              <h2>Search Merchant Or Category</h2>
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
                  <label htmlFor="spend-input">Spend Amount (EUR)</label>
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

                <label className="checkbox-row" htmlFor="foreign-spend-checkbox">
                  <input
                    id="foreign-spend-checkbox"
                    type="checkbox"
                    checked={isForeignSpend}
                    onChange={(event) => setIsForeignSpend(event.target.checked)}
                  />
                  Foreign currency spend
                </label>
              </div>
            </section>

            <section className="recommendation-area">
              {ownedCards.length === 0 ? (
                <div className="card empty-state">
                  <strong>No cards selected.</strong> Under **Step 2**, select the cards you currently own to calculate and compare rewards.
                </div>
              ) : !hasSearch ? (
                <div className="card empty-state">
                  <strong>Ready to search.</strong> Under **Step 3**, enter a merchant or choose a category to calculate your expected rewards.
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
                      <p>{bestResult.rec.explanation}</p>
                    </div>
                    <div>
                      <h3>Spend calculation</h3>
                      <p>
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
                    Unsupported cards or rewards are intentionally omitted rather than assumed/guessed.
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
        CardPin is not financial advice. Sources can change; always verify current terms with your issuer.
      </footer>
    </div>
  );
}

